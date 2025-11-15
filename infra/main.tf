terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "junkkari2025-tf-state-europe-north1"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {}

resource "google_project_service" "run" {
  service = "run.googleapis.com"
}

resource "google_dns_managed_zone" "brokenomore" {
  name        = "brokenomore-club"
  dns_name    = "brokenomore.club."
  description = "Public DNS zone for brokenomore.club"
}

resource "google_service_account" "cloud_run" {
  account_id   = "cloud-run-sa"
  display_name = "Cloud Run runtime service account"
}

resource "google_cloud_run_v2_service" "app" {
  name     = "financial-advisor-sim"
  location = var.region

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      image = var.container_image

      ports {
        container_port = 80
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.run,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  name   = google_cloud_run_v2_service.app.name
  role   = "roles/run.invoker"
  member = "allUsers"
}

resource "google_cloud_run_domain_mapping" "brokenomore" {
  name     = "brokenomore.club"
  location = var.region

  metadata {
    namespace = data.google_project.current.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.app.name
  }
}

locals {
  brokenomore_dns_records_A = [
    for rr in google_cloud_run_domain_mapping.brokenomore.status[0].resource_records :
    rr.rrdata if rr.type == "A"
  ]

  brokenomore_dns_records_AAAA = [
    for rr in google_cloud_run_domain_mapping.brokenomore.status[0].resource_records :
    rr.rrdata if rr.type == "AAAA"
  ]

  brokenomore_dns_records_CNAME = [
    for rr in google_cloud_run_domain_mapping.brokenomore.status[0].resource_records :
    rr.rrdata if rr.type == "CNAME"
  ]
}

resource "google_dns_record_set" "brokenomore_apex_a" {
  count        = length(local.brokenomore_dns_records_A) > 0 ? 1 : 0
  managed_zone = google_dns_managed_zone.brokenomore.name
  name         = google_dns_managed_zone.brokenomore.dns_name
  type         = "A"
  ttl          = 300
  rrdatas      = local.brokenomore_dns_records_A
}

resource "google_dns_record_set" "brokenomore_apex_aaaa" {
  count        = length(local.brokenomore_dns_records_AAAA) > 0 ? 1 : 0
  managed_zone = google_dns_managed_zone.brokenomore.name
  name         = google_dns_managed_zone.brokenomore.dns_name
  type         = "AAAA"
  ttl          = 300
  rrdatas      = local.brokenomore_dns_records_AAAA
}

resource "google_dns_record_set" "brokenomore_apex_cname" {
  count        = length(local.brokenomore_dns_records_A) > 0 || length(local.brokenomore_dns_records_AAAA) > 0 ? 0 : 1
  managed_zone = google_dns_managed_zone.brokenomore.name
  name         = google_dns_managed_zone.brokenomore.dns_name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = local.brokenomore_dns_records_CNAME
}

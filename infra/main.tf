terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
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

      env {
        name  = "GOOGLE_GENERATIVE_AI_API_KEY"
        value = var.google_generative_ai_api_key
      }

      env {
        name  = "ELEVENLABS_API_KEY"
        value = var.elevenlabs_api_key
      }

      env {
        name  = "DATABASE_URL"
        value = format(
          "postgresql://%s:%s@%s:5432/%s",
          urlencode(var.db_user),
          urlencode(random_password.db_password.result),
          google_sql_database_instance.app.private_ip_address,
          urlencode(var.db_name),
        )
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.serverless.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
  scaling {
    min_instance_count = 0
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }

  depends_on = [
    google_project_service.run,
    google_vpc_access_connector.serverless,
    google_sql_database_instance.app,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

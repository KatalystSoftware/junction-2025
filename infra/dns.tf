data "google_project" "current" {}
resource "google_dns_record_set" "search_console_verify" {
  name         = "brokenomore.club." # or "_google-site-verification.brokenomore.club."
  type         = "TXT"
  ttl          = 300
  managed_zone = google_dns_managed_zone.brokenomore.name

  rrdatas = [
    "google-site-verification=TwzNVj-fcZtbo6ID_btu29RjIXqRX4vuTOyJU3nfJFo"
  ]
}

resource "google_cloud_run_domain_mapping" "brokenomore" {
  name     = "brokenomore.club"
  location = var.region

  metadata {
    namespace = data.google_project.current.project_id
  }

  spec {
    certificate_mode = "AUTOMATIC"
    route_name       = google_cloud_run_v2_service.app.name
  }
  depends_on = [google_dns_record_set.search_console_verify]
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


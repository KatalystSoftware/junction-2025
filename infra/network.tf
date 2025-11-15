resource "google_project_service" "service_networking" {
  service            = "servicenetworking.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "vpcaccess" {
  service            = "vpcaccess.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_network" "private" {
  name                    = "private-network"
  auto_create_subnetworks = false
}

resource "google_compute_global_address" "private_service_connect" {
  name          = "private-service-connect"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.private.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.private.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_connect.name]

  depends_on = [google_project_service.service_networking]
}

resource "google_vpc_access_connector" "serverless" {
  name          = "serverless-connector"
  region        = var.region
  network       = google_compute_network.private.name
  ip_cidr_range = "10.8.0.0/28"

  min_throughput = 200
  max_throughput = 300

  depends_on = [
    google_project_service.vpcaccess,
    google_compute_network.private,
  ]
}

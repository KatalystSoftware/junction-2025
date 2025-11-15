resource "google_project_service" "compute" {
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_subnetwork" "bastion" {
  name          = "bastion-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.private.id
}

resource "google_compute_firewall" "bastion_ssh" {
  name    = "bastion-ssh-allow"
  network = google_compute_network.private.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["bastion-ssh"]
}

resource "google_compute_instance" "bastion" {
  name         = "db-bastion"
  machine_type = "e2-micro"
  zone         = var.bastion_zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-13"
      size  = 10
    }
  }

  network_interface {
    network    = google_compute_network.private.name
    subnetwork = google_compute_subnetwork.bastion.name

    access_config {} # ephemeral public IP
  }

  tags = ["bastion-ssh"]

  depends_on = [google_project_service.compute]
}

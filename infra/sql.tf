resource "google_sql_database_instance" "app" {
  name             = "financial-advisor-db"
  database_version = "POSTGRES_17"
  region           = var.region

  settings {
    tier    = "db-f1-micro"
    edition = "ENTERPRISE"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.private.id
    }
  }

  deletion_protection = false

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
  ]
}

resource "google_sql_database" "app" {
  name     = var.db_name
  instance = google_sql_database_instance.app.name
}

resource "google_sql_user" "app" {
  name     = var.db_user
  instance = google_sql_database_instance.app.name
  password = random_password.db_password.result
}

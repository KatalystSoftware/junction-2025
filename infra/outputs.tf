output "db_private_ip" {
  description = "Private IP address of the PostgreSQL instance"
  value       = google_sql_database_instance.app.private_ip_address
}


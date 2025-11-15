resource "random_password" "db_password" {
  length  = 24
  special = true
}

output "db_password" {
  description = "Generated PostgreSQL user password"
  value       = random_password.db_password.result
  sensitive   = true
}


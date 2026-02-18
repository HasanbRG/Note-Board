FROM php:8.2-apache

# Install MySQL PDO driver
RUN docker-php-ext-install pdo pdo_mysql

# Enable Apache rewrite (useful later)
RUN a2enmod rewrite

# Set working directory
WORKDIR /var/www/html

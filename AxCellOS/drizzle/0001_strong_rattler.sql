CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(20) NOT NULL,
	`customerId` int NOT NULL,
	`deviceBrand` varchar(100) NOT NULL,
	`deviceModel` varchar(100) NOT NULL,
	`defectDescription` text NOT NULL,
	`status` enum('Recebido','Em Reparo','Pronto','Entregue') NOT NULL DEFAULT 'Recebido',
	`notes` text,
	`estimatedCost` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deliveredAt` timestamp,
	CONSTRAINT `service_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);

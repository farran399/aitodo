create database if not exists `aitodo`;

use `aitodo`;

create table if not exists `users` (
    `id` int primary key auto_increment,
    `username` varchar(20) not null unique,
    `password` varchar(32) not null,
    `created_at` timestamp default current_timestamp
);

create table if not exists `chat` (
    `chat_session_id` varchar(50) primary key,
    `user_id` int,
    `created_at` timestamp default current_timestamp,
    foreign key (`user_id`) references `users`(`id`)
);

create table if not exists `message` (
    `id` int primary key auto_increment,
    `chat_session_id` varchar(50),
    `content` text not null,
    `role` varchar(10) not null,
    `created_at` timestamp default current_timestamp,
    foreign key (`chat_session_id`) references `chat`(`chat_session_id`)
);


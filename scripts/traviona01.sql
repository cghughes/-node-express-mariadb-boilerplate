CREATE TABLE IF NOT EXISTS `user`
(
	`id` int auto_increment
	    primary key,
	`uuid` varchar(36) DEFAULT UUID(),
    `inserted` datetime NULL,
    `updated` datetime NULL,

	`display_name` varchar(255) NULL,
	`email` varchar(255) NULL,
	`password` varchar(255) NULL,
	`role` varchar(255) NULL,

	constraint user_email_uindex
	    unique (email)
);

CREATE TABLE IF NOT EXISTS `token`
(
	`id` int auto_increment
		primary key,
    `uuid` varchar(36) DEFAULT UUID(),
    `inserted` datetime NULL,
    `updated` datetime NULL,

    `value` varchar(255) NOT NULL,
	`user_id` int NULL,
	`expires` datetime NULL,
	`type` varchar(255) NULL,
	`blacklisted` tinyint(1) NULL,

	constraint token_user_id_fk
		foreign key (user_id) references user (id)
);

DROP TRIGGER IF EXISTS `user_insert_trigger`;
CREATE TRIGGER IF NOT EXISTS `user_insert_trigger` BEFORE INSERT ON `user`
    FOR EACH ROW
BEGIN
    SET new.inserted = now();
    SET new.updated = now();
END;

DROP TRIGGER IF EXISTS `user_update_trigger`;
CREATE TRIGGER IF NOT EXISTS `user_update_trigger` BEFORE UPDATE ON `user`
    FOR EACH ROW
BEGIN
    SET new.updated = now();
END;

DROP TRIGGER IF EXISTS `token_insert_trigger`;
CREATE TRIGGER IF NOT EXISTS `token_insert_trigger` BEFORE INSERT ON `token`
    FOR EACH ROW
BEGIN
    SET new.inserted = now();
    SET new.updated = now();
END;

DROP TRIGGER IF EXISTS `token_update_trigger`;
CREATE TRIGGER IF NOT EXISTS `token_update_trigger` BEFORE UPDATE ON `token`
    FOR EACH ROW
BEGIN
    SET new.updated = now();
END;
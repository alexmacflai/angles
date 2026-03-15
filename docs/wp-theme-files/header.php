<!DOCTYPE html>
<html <?php language_attributes(); ?> <?php blankslate_schema_type(); ?>>

<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width">
    <?php wp_head(); ?>
    <link rel="icon" href="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/favicon.png" type="image/x-icon">
    <link rel="icon" href="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/favicon.svg" type="image/x-icon">
</head>

<body <?php body_class(); ?>>
    <?php get_template_part("components/pointer"); ?>
    <header id="header" role="banner">
        <div id="site-title" itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
            <a href="<?php echo get_home_url(); ?>" title="<?php esc_attr(get_bloginfo('name')); ?>" rel="home" itemprop="url">
                <h1><?php get_template_part('components/logo'); ?></h1>
            </a>

        </div>
        <nav id="menu" role="navigation" itemscope itemtype="https://schema.org/SiteNavigationElement">
            <a class="intro-toggle">
                <?php get_template_part('components/icon', 'hand'); ?>
                <span class="label">
                    who dis?</span></a>

            <a class="selection" href="<?php echo get_home_url(); ?>/selection">
                <?php get_template_part('components/icon', 'wand'); ?>

                <span class="label">
                    <?php
                    if (is_front_page() || is_home() || is_front_page() && is_home()) {
                        echo 'make a selection';
                    };

                    if (is_page()) {
                        echo 'make another';
                    }
                    ?></span></a>
        </nav>
        <div class="intro">
            <div class="inner">
                <button class="intro-toggle">
                    <?php get_template_part('components/icon', 'close'); ?>
                    <span class="label">close</span></button>
                <p class="text-animation">
                    Hi, I'm <span class="name">Alex Cruz</span>, and this is Angles, a collection of
                    <?php
                    $args = array(
                        'post_type'      => 'attachment',
                        'post_mime_type' => 'image',
                        'post_status'    => 'inherit',
                        'posts_per_page' => -1, // Load all images
                        'orderby'        => 'rand', // Random order
                    );

                    $images = new WP_Query($args);
                    $image_count = $images->found_posts; // Get the total number of images found
                    echo $image_count;
                    ?>
                    pics I've taken. No order, no fancy rationale, just whatever vibes I got from them. Do you like to gamble? Click on "make a selection" and pull a random 12 pics related by tag.
                </p>
                <p class="text-animation links">
                    If you dig this project, you can check out the other stuff I do, like <a href=<?php echo get_site_url(3); ?> target="_blank">Open bars</a>, <a href=<?php echo get_site_url(2); ?> target="_blank">NOLEFTOVERS</a> or <a href="https://open.spotify.com/show/38GvMWusP4DZXYxmvFmKqw?si=9d2dc527fa9348f3" target="_blank">God's Answering Machine</a>. You can peek at <a href=<?php echo get_site_url(1); ?>> my portfolio</a> or stalk me at <a href="https://www.instagram.com/alexmacflai/" target="_blank">@alexmacflai</a> too.
                </p>
            </div>
        </div>
    </header>
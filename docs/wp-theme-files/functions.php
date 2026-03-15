<?php

// Enqueue custom script
wp_enqueue_script('custom-script', get_stylesheet_directory_uri() . '/js/scripts.js', array('jquery'), '1.0', true);

// Enqueue GSAP (GreenSock Animation Platform) library and its plugins
wp_enqueue_script('smooth-scrolling', get_stylesheet_directory_uri() . '/js/SmoothScroll.js', array(), null, true);
wp_enqueue_script('gsap', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.3/gsap.min.js', array(), null, true);
wp_enqueue_script('gsap-scrolltrigger', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.3/ScrollTrigger.min.js', array('gsap'), null, true);
wp_enqueue_script('gsap-draggable', 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.3/Draggable.min.js', array('gsap'), null, true);
wp_enqueue_script('text-animation', 'https://cdnjs.cloudflare.com/ajax/libs/animejs/2.0.2/anime.min.js', array(), null, true);
// Enqueue Masonry library
wp_enqueue_script('masonry', 'https://unpkg.com/masonry-layout@4/dist/masonry.pkgd.min.js', null, true);
wp_enqueue_script('masonry-imagesLoaded', get_stylesheet_directory_uri() . '/js/imagesloaded.pkgd.min.js', null, true);
// Lottie library
wp_enqueue_script('lottie', 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js', array(), null, true);


function enqueue_google_fonts()
{
    wp_enqueue_style('google-fonts', 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@200&display=swap', [], null);
}
add_action('wp_enqueue_scripts', 'enqueue_google_fonts');

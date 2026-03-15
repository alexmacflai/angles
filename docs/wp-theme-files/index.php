<?php get_header(); ?>
<main class="grid" id="imageGrid">
    <div class="inner">
        <?php
        $args = array(
            'post_type'      => 'attachment',
            'post_mime_type' => 'image',
            'post_status'    => 'inherit',
            'posts_per_page' => -1, // Load all images
            'orderby'        => 'rand', // Random order
        );

        $images = new WP_Query($args);

        // Initialize an array to hold all image IDs
        $allImageIDs = [];

        // Fetch all images to populate the array
        if ($images->have_posts()) :
            while ($images->have_posts()) : $images->the_post();
                $allImageIDs[] = get_the_ID();
            endwhile;
        endif;


        // Reset the query to loop again for output
        $images->rewind_posts();

        $carouselImagesHtml = '';

        if ($images->have_posts()) :
            while ($images->have_posts()) : $images->the_post();
                $id = get_the_ID();
                $randomNumber = rand(1, 100);
                $class = '';

                if ($randomNumber <= 60) {
                    $class = 'uno';
                } elseif ($randomNumber <= 90) {
                    $class = 'dos';
                } elseif ($randomNumber <= 100) {
                    $class = 'tres';
                } else {
                    $class = 'uno';
                }



                // Generate the image HTML
                $carouselImageHtml = wp_get_attachment_image($id, 'large', false, ['loading' => 'lazy']);

                // Output the image HTML with .image wrapper for the .inner container
                echo '<div class="image imageGrid ' . $class . '" data-image-id="' . $id . '">';
                echo $carouselImageHtml;
                echo '</div>';

                // Add only the img HTML to the carouselImagesHtml string for later use
                $carouselImagesHtml .= $carouselImageHtml;
            endwhile;
        else :
            echo '<p>No images found.</p>';
        endif;

        wp_reset_postdata();
        ?>

    </div>

</main>
<div class="lightbox-carousel">
    <div class="carousel">
        <?php echo $carouselImagesHtml; // Output the carousel images 
        ?>
    </div>
</div>
<?php get_footer(); ?>
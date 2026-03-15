<?php
/*
Template Name: Selection
*/
get_header();
?>

<main class="grid" id="imageGrid">
    <div class="inner">
        <?php
        $args = array(
            'post_type' => 'attachment',
            'post_mime_type' => 'image',
            'post_status' => 'inherit',
            'posts_per_page' => -1,
        );

        $images = new WP_Query($args);
        $allImages = [];

        if ($images->have_posts()) :
            while ($images->have_posts()) : $images->the_post();
                $id = get_the_ID();
                $terms = array_merge(
                    wp_get_object_terms($id, 'attachment_category', array('fields' => 'ids')),
                    wp_get_object_terms($id, 'attachment_tag', array('fields' => 'ids'))
                );
                $allImages[$id] = $terms;
            endwhile;
        endif;

        wp_reset_postdata(); // It's a good practice to reset post data before making another query

        $firstImageID = array_rand($allImages);
        $firstImageTerms = $allImages[$firstImageID];
        unset($allImages[$firstImageID]);

        $scores = [];
        foreach ($allImages as $id => $terms) {
            $scores[$id] = count(array_intersect($firstImageTerms, $terms));
        }

        arsort($scores);
        $selectedImageIDs = array_slice(array_keys($scores), 0, 11, true);
        array_unshift($selectedImageIDs, $firstImageID);

        $lightboxImagesHtml = ''; // Initialize variable to accumulate carousel images HTML

        foreach ($selectedImageIDs as $id) {
            $randomNumber = rand(1, 100);
            $class = $randomNumber <= 75 ? 'uno' : ($randomNumber <= 85 ? 'dos' : ($randomNumber <= 95 ? 'tres' : 'uno'));

            $categories = wp_get_object_terms($id, 'attachment_category', array('fields' => 'names'));
            $labels = wp_get_object_terms($id, 'attachment_tag', array('fields' => 'names'));

            $imageHtml = wp_get_attachment_image($id, 'large', false, ['loading' => 'lazy']);

            echo '<div class="image imageGrid ' . $class . '" data-image-id="' . $id . '">';
            echo $imageHtml;
            // echo '<p>Category: ' . implode(', ', $categories) . '</p>';
            // echo '<p>Label: ' . implode(', ', $labels) . '</p>';
            echo '</div>';

            // Accumulate HTML for lightbox
            $lightboxImagesHtml .=  $imageHtml;
        }
        ?>

    </div>
</main>
<div class="lightbox-carousel">
    <div class="carousel">
        <?php echo $lightboxImagesHtml; // Output the accumulated carousel images 
        ?>
    </div>
</div>
<?php get_footer(); ?>
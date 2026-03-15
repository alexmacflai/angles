jQuery(document).ready(function ($) {
  // Masonry units
  var remInPixels = parseFloat(getComputedStyle(document.documentElement).fontSize);
  var gutterRem = 0.25;
  var gutterSizeInPixels = gutterRem * remInPixels;

  // Select the main .inner element and wait for all images to load
  var $grid = $("main .inner").imagesLoaded(function () {
    $grid.masonry({
      columnWidth: ".inner .image",
      itemSelector: ".inner .image",
      gutter: gutterSizeInPixels,
      percentPosition: true,
      transitionDuration: "0.2s",
      stagger: 2,
    });

    // Once Masonry is initialized, apply animations to images as they scroll into view
    $grid.on("layoutComplete", function () {
      gsap.from("main", {
        y: 0,
      });

      gsap.to("main", {
        opacity: 1,
        duration: 1.6,
        y: 0,
      });

      gsap.utils.toArray(".inner .image").forEach((item) => {
        gsap.from(item, {
          opacity: 0,
          y: 120,
          scale: 0.75,
          duration: 0.8,
          stagger: 0.225,
          scrollTrigger: {
            trigger: item,
            start: "top bottom",
            end: "bottom bottom",
            scrub: false,
            once: true,
          },
        });
      });

      // Apply animations to images in the lightbox carousel for horizontal scrolling
      gsap.utils.toArray(".carousel img").forEach((item) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: item,
            scroller: ".carousel",
            start: "left right",
            end: "right left",
            scrub: true,
            once: false,
            toggleActions: "play none none reverse",
            horizontal: true,
          },
        });

        tl.from(item, {
          opacity: 0.25,
          x: 120,
          scale: 0.8,
          duration: 1,
        }).to(
          item,
          {
            opacity: 0.25,
            x: -120,
            scale: 0.8,
            duration: 1,
          },
          "+=0.1"
        );
      });
    });

    $grid.masonry();
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const buttons = document.querySelectorAll(".intro-toggle");
  const targets = document.querySelectorAll(".intro");

  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      targets.forEach((target) => target.classList.toggle("active"));
      document.body.classList.toggle("no-scroll");
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const buttons = document.querySelectorAll(".selection-toggle");
  const targets = document.querySelectorAll(".inner");

  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      targets.forEach((target) => target.classList.toggle("active"));
    });
  });
});

// Find hovered image in carousel and center it
document.addEventListener("DOMContentLoaded", function () {
  const images = document.querySelectorAll(".inner .image");
  const carousel = document.querySelector(".carousel");

  images.forEach((image, index) => {
    image.addEventListener("mouseenter", function () {
      const carouselImage = carousel.children[index];
      const scrollPosition = carouselImage.offsetLeft + carouselImage.clientWidth / 2 - carousel.clientWidth / 2;
      carousel.scrollTo({ left: scrollPosition, behavior: "smooth" });
    });
  });
});

// Disable scroll in main container when lightbox is open
document.addEventListener("DOMContentLoaded", function () {
  const buttons = document.querySelectorAll(".image, .lightbox-carousel");
  const targets = document.querySelectorAll(".lightbox-carousel");

  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      const isLightboxActive = targets[0].classList.contains("active");
      targets.forEach((target) => target.classList.toggle("active"));
      if (!isLightboxActive) {
        disableBodyScroll();
      } else {
        enableBodyScroll();
      }
    });
  });
});

let scrollPosition = 0;

function disableBodyScroll() {
  scrollPosition = window.pageYOffset;
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollPosition}px`;
  document.body.style.width = "100%";
}

function enableBodyScroll() {
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("position");
  document.body.style.removeProperty("top");
  document.body.style.removeProperty("width");
  window.scrollTo(0, scrollPosition);
}

document.addEventListener("DOMContentLoaded", function () {
  const carousel = document.querySelector(".carousel");
  let isDown = false;
  let startX;
  let scrollLeft;
  let dragged = false;
  let velocity = 0;
  let lastX;
  let rafId;

  function animate() {
    if (!isDown) {
      carousel.scrollLeft += velocity;
      velocity *= 0.95;

      if (Math.abs(velocity) > 10) {
        rafId = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(rafId);
        if (dragged) {
          snapToClosestImage();
        }
      }
    }
  }

  carousel.addEventListener("mousedown", (e) => {
    isDown = true;
    dragged = false;
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
    lastX = e.pageX;
    velocity = 0;
    cancelAnimationFrame(rafId);

    // Kill any ongoing GSAP animations for the carousel to prioritize new drag
    gsap.killTweensOf(carousel);
  });

  carousel.addEventListener("mouseleave", () => {
    isDown = false;
    animate();
  });

  carousel.addEventListener("mouseup", () => {
    isDown = false;
    carousel.classList.remove("active");
    animate();
  });

  carousel.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    dragged = true;
    const x = e.pageX - carousel.offsetLeft;
    const dx = x - lastX;
    velocity = dx * -1;
    lastX = x;

    const walk = x - startX;
    carousel.scrollLeft = scrollLeft - walk;
  });

  carousel.addEventListener(
    "click",
    (e) => {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  function snapToClosestImage() {
    const images = carousel.querySelectorAll("img");
    const carouselCenter = carousel.scrollLeft + carousel.offsetWidth / 2;
    let closestImage = null;
    let minDistance = Infinity;

    images.forEach((img) => {
      const imgCenter = img.offsetLeft + img.offsetWidth / 2;
      const distance = Math.abs(carouselCenter - imgCenter);

      if (distance < minDistance) {
        closestImage = img;
        minDistance = distance;
      }
    });

    if (closestImage) {
      const scrollTo = closestImage.offsetLeft + closestImage.offsetWidth / 2 - carousel.offsetWidth / 2;
      gsap.to(carousel, {
        scrollLeft: scrollTo,
        duration: 1,
        ease: "power2.out",
      });
    }
  }
});

// Hover only when content
jQuery(document).ready(function ($) {
  $(".inner .image").mouseenter(function () {
    $(this).closest("main .inner").addClass("hovering-image");
  });

  $(".inner .image").mouseleave(function () {
    $(this).closest("main .inner").removeClass("hovering-image");
  });
});

// Text animation
jQuery(document).ready(function ($) {
  function wrapLettersAndPreserveTags() {
    document.querySelectorAll(".text-animation").forEach(function (textWrapper) {
      function wrapLetters(word) {
        return word
          .split("")
          .map((letter) => `<span class='letter'>${letter}</span>`)
          .join("");
      }

      // Convert the HTML to a temporary div to work with its contents
      var tempDiv = document.createElement("div");
      tempDiv.innerHTML = textWrapper.innerHTML;
      var newHtml = "";

      // Process each node in the temporary div
      Array.from(tempDiv.childNodes).forEach((node) => {
        if (node.nodeType === 3) {
          var words = node.textContent.trim().split(/\s+/).map(wrapLetters);
          words.forEach((word) => {
            newHtml += `<span class='word'>${word}</span> `;
          });
        } else if (node.nodeType === 1) {
          var wrappedContent = "";
          var childWords = node.textContent.trim().split(/\s+/).map(wrapLetters);
          childWords.forEach((word) => {
            wrappedContent += `<span class='word'>${word}</span> `;
          });

          var newNode = document.createElement(node.tagName);
          Array.from(node.attributes).forEach((attr) => {
            newNode.setAttribute(attr.nodeName, attr.nodeValue);
          });
          newNode.innerHTML = wrappedContent.trim();

          newHtml += newNode.outerHTML + " ";
        }
      });

      textWrapper.innerHTML = newHtml.trim();
    });
  }
  wrapLettersAndPreserveTags();
});

jQuery(document).ready(function ($) {
  $(".intro-toggle").click(function () {
    initAnimation();
  });
});

function initAnimation() {
  anime.timeline({ loop: false }).add({
    targets: ".intro.active .text-animation .letter",
    translateY: [50, 0],
    translateZ: 0,
    opacity: [0, 1],
    easing: "easeOutExpo",
    duration: 2000,
    delay: (el, i) => 0 + 4 * i,
  });
}

// Follow cursor
document.addEventListener("mousemove", function (event) {
  const followCursor = document.querySelector("#cursor");
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  followCursor.style.left = event.pageX - scrollLeft + "px";
  followCursor.style.top = event.pageY - scrollTop + "px";
});

// Cursor types
const pointer = document.querySelector("#cursor");
const pointerHover = "hover";
const pointerEye = "eye";
const pointerDot = "dot";
const pointerPressed = "pressed";

setTimeout(() => {
  document.querySelectorAll("a, button, .carousel").forEach((element) => {
    element.addEventListener("mouseover", () => {
      pointer.classList.add(pointerHover, pointerDot);
    });
    element.addEventListener("mouseout", () => {
      pointer.classList.remove(pointerHover, pointerDot);
    });
  });

  document.querySelectorAll(".imageGrid").forEach((img) => {
    img.addEventListener("mouseover", () => {
      pointer.classList.add(pointerHover, pointerEye);
    });
    img.addEventListener("mouseout", () => {
      pointer.classList.remove(pointerHover, pointerEye);
    });
  });
}, 800);

document.addEventListener("mousedown", () => {
  pointer.classList.add(pointerPressed);
});

document.addEventListener("mouseup", () => {
  pointer.classList.remove(pointerPressed);
});

<template>
  <svg
    class="brand-wave"
    viewBox="0 0 700 280"
    fill="none"
    aria-hidden="true"
    focusable="false"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient
        id="penny-wave"
        x1="350"
        y1="30"
        x2="350"
        y2="280"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#60DA9A" stop-opacity=".9" />
        <stop offset=".5" stop-color="#087A49" stop-opacity=".65" />
        <stop offset="1" stop-color="#063D29" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path d="M0 40C170 90 250 240 440 140C560 70 615 20 700 40V280H0Z" fill="url(#penny-wave)" />
    <path
      d="M0 130C170 80 270 220 430 200C550 180 620 100 700 115V280H0Z"
      fill="url(#penny-wave)"
      opacity=".55"
    />
    <path
      d="M0 210C170 100 230 130 420 215C540 265 610 160 700 175V280H0Z"
      fill="url(#penny-wave)"
      opacity=".35"
    />
  </svg>
</template>

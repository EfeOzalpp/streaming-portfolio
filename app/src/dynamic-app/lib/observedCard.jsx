// src/dynamic-app/lib/observedCard.jsx
import React, { useRef } from 'react';
import UIcards from '../components/homepageUIcards';
import { useIntersectionTransform } from './cardTransformCore';

function ObservedCard({
  data,
  index,
  pauseAnimation,
  customArrowIcon2,
  imagePriority = false,
}) {
  const ref = useRef(null);

  useIntersectionTransform(ref, pauseAnimation);

  return (
    <UIcards
      ref={ref}
      title={data.title}
      backgroundColor={data.backgroundColor}
      image1={data.image1}
      image2={data.image2}
      alt1={data.alt1}
      alt2={data.alt2}
      url1={data.url1}
      className={`custom-card-${index}`}
      customArrowIcon2={customArrowIcon2}
      imagePriority={imagePriority}
    />
  );
}

export default ObservedCard;
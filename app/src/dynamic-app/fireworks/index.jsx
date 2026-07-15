import React, { useCallback, useEffect, useRef, useState } from 'react';
import q5 from 'q5';
import { useStyleInjection } from '../../state/providers/style-injector';
import { useRealMobileViewport } from '../../shared/useRealMobile';
import fireworksCss from '../../styles/dynamic-app/fireworks.css?raw';
import { createFireworksSketch } from './createFireworksSketch';
import { useDocumentVisibilityOffset } from './useDocumentVisibility';

const FireworksDisplay = ({ colorMapping = {}, items = [], onToggleFireworks }) => {
  const canvasRef = useRef(null);
  const [fireworksEnabled, setFireworksEnabled] = useState(true);
  const fireworksRef = useRef([]);
  const fireworksEnabledRef = useRef(true);
  const p5InstanceRef = useRef(null);
  const latestItems = useRef(items);
  const latestColorMapping = useRef(colorMapping);
  const isRealMobile = useRealMobileViewport();
  const isRealMobileRef = useRef(isRealMobile);
  const { hiddenDurationRef } = useDocumentVisibilityOffset();

  useStyleInjection(fireworksCss, 'dynamic-app-style-fireworks');

  useEffect(() => {
    isRealMobileRef.current = isRealMobile;
  }, [isRealMobile]);

  useEffect(() => {
    latestItems.current = items;
    latestColorMapping.current = colorMapping;
  }, [items, colorMapping]);

  useEffect(() => {
    if (!canvasRef.current || p5InstanceRef.current) return;

    const sketch = createFireworksSketch({
      fireworksRef,
      fireworksEnabledRef,
      hiddenDurationRef,
      latestItems,
      latestColorMapping,
      isRealMobileRef,
      canvasRef,
    });

    p5InstanceRef.current = new q5(sketch, canvasRef.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
      fireworksRef.current = [];
    };
  }, [hiddenDurationRef]);

  const toggleFireworks = useCallback((isEnabled) => {
    setFireworksEnabled(isEnabled);
    fireworksEnabledRef.current = isEnabled;
  }, []);

  useEffect(() => {
    onToggleFireworks?.(toggleFireworks);
  }, [onToggleFireworks, toggleFireworks]);

  useEffect(() => {
    fireworksEnabledRef.current = fireworksEnabled;
  }, [fireworksEnabled]);

  return (
    <div
      ref={canvasRef}
      className={`fireworks-canvas ${fireworksEnabled ? 'is-running' : 'is-paused'}`}
      aria-hidden="true"
    />
  );
};

export default FireworksDisplay;

// src/ssr/content/agentic-tools.enhancer.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AgenticProvider } from '../../state/providers/agentic-context';
import { AgenticSurface } from '../../components/agentic-tools';
import { useTooltipInit } from '../../components/general-ui/tooltip/tooltipInit';

const AgenticToolsEnhancer: React.FC = () => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useTooltipInit();

  useEffect(() => {
    const shell = document.querySelector(
      '[data-ssr-shell="agentic-tools"]'
    ) as HTMLElement | null;
    if (shell) {
      shell.replaceChildren();
      setHost(shell);
    }
  }, []);

  if (!host) return null;

  return createPortal(
    <AgenticProvider>
      <AgenticSurface />
    </AgenticProvider>,
    host
  );
};

export default AgenticToolsEnhancer;

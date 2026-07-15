// src/ssr/content/query-searcher.enhancer.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QuerySearcherProvider } from '../../state/providers/query-searcher-context';
import { QuerySearcherSurface } from '../../components/query-searcher';
import { useTooltipInit } from '../../components/general-ui/tooltip/tooltipInit';

const QuerySearcherEnhancer: React.FC = () => {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useTooltipInit();

  useEffect(() => {
    const shell = document.querySelector(
      '[data-ssr-shell="query-searcher"]'
    ) as HTMLElement | null;
    if (shell) {
      shell.replaceChildren();
      setHost(shell);
    }
  }, []);

  if (!host) return null;

  return createPortal(
    <QuerySearcherProvider>
      <QuerySearcherSurface />
    </QuerySearcherProvider>,
    host
  );
};

export default QuerySearcherEnhancer;

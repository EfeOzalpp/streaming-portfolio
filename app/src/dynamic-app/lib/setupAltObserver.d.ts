type SetupAltObserverOpts = {
  onActivateMany?: ((alts: string[]) => void) | null;
  topN?: number;
  minVisible?: number;
  thresholds?: number[];
  root?: Element | null;
  rootMargin?: string;
  bootstrap?: boolean;
};

declare function setupAltObserver(
  onActivate: (alt: string) => void,
  onDeactivate: (alt: string) => void,
  rootElement?: Document | HTMLElement,
  opts?: SetupAltObserverOpts
): () => void;

export default setupAltObserver;

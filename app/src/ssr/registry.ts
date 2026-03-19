// src/ssr/registry.ts
import type { SsrRegistry } from './types';
import { scoopSSR }         from './content/scoop.ssr';
import { rotarySSR }        from './content/rotary.ssr';
import { datavizSSR }       from './content/dataviz.ssr';
import { dynamicSSR }       from './content/dynamic.ssr';
import { gameSSR }          from './content/game.ssr';
import { agenticToolsSSR }  from './content/agentic-tools.ssr';
import { kirklandSSR }      from './content/kirkland.ssr';

export const ssrRegistry: SsrRegistry = {
  scoop:           scoopSSR,
  rotary:          rotarySSR,
  dataviz:         datavizSSR,
  dynamic:         dynamicSSR,
  game:            gameSSR,
  'agentic-tools': agenticToolsSSR,
  kirkland:        kirklandSSR,
};

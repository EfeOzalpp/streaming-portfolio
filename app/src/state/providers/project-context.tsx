// src/state/providers/project-context.tsx
import React, {
  createContext,
  useState,
  useContext,
  useRef,
  ReactNode,
} from 'react';

interface ProjectVisibilityContextType {
  activeProject?: string;
  setActiveProject: (title: string) => void;

  blockGClick: boolean;
  setBlockGClick: (clicked: boolean) => void;

  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;

  scrollContainerRef: React.RefObject<HTMLDivElement | null>;

  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;

  focusedProjectKey: string | null;
  setFocusedProjectKey: React.Dispatch<React.SetStateAction<string | null>>;
}

interface ProjectVisibilityProviderProps {
  children: ReactNode;
}

const ProjectVisibilityContext = createContext<ProjectVisibilityContextType | undefined>(undefined);

export const ProjectVisibilityProvider = ({ children }: ProjectVisibilityProviderProps) => {
  const [activeProject, setActiveProject] = useState<string | undefined>(undefined);
  const [blockGClick, setBlockGClick] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [focusedProjectKey, setFocusedProjectKey] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <ProjectVisibilityContext.Provider
      value={{
        activeProject,
        setActiveProject,
        blockGClick,
        setBlockGClick,
        currentIndex,
        setCurrentIndex,
        scrollContainerRef,
        isDragging,
        setIsDragging,
        focusedProjectKey,
        setFocusedProjectKey,
      }}
    >
      {children}
    </ProjectVisibilityContext.Provider>
  );
};

export const useProjectVisibility = () => {
  const context = useContext(ProjectVisibilityContext);
  if (!context) {
    throw new Error('useProjectVisibility must be used within ProjectVisibilityProvider');
  }
  return context;
};

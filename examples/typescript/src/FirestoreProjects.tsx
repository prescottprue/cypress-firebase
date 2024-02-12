import React, { useState, useEffect, useCallback } from 'react';
import Project, { ProjectData } from './Project';
import {
  getFirestore,
  query,
  collection,
  limit,
  onSnapshot,
} from 'firebase/firestore';

export default function Projects() {
  const [loading, setLoadingState] = useState(false);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [errorState, setErrorState] = useState<string>();

  const loadProjects = useCallback(() => {
    setLoadingState(true);
    const firestore = getFirestore();
    const projectsQuery = query(
      collection(firestore, 'public_projects'),
      limit(10),
    );
    return onSnapshot(
      projectsQuery,
      (snap) => {
        console.log('projects');
        setProjects(
          snap.docs.map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          })),
        );
        setLoadingState(false);
      },
      (err) => {
        console.log('err', err);
        setErrorState(err?.toString ? err.toString() : JSON.stringify(err));
        setLoadingState(false);
      },
    );
  }, [setLoadingState, setProjects, setErrorState]);

  useEffect(() => {
    const unsetProjectsListener = loadProjects();
    return () => {
      unsetProjectsListener();
    };
  }, [loadProjects]);

  if (errorState) {
    return <div>Error</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!projects || !projects.length) {
    return <div>Projects not found</div>;
  }

  return (
    <div data-test="projects">
      {projects.map((project, projectKey) => (
        <Project key={`Project-${projectKey}`} project={project} />
      ))}
    </div>
  );
}

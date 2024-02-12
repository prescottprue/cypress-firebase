import React, { useState, useEffect, useCallback } from 'react';
import Project from './Project';
import {
  getFirestore,
  query,
  collection,
  limit,
  onSnapshot,
} from 'firebase/firestore';

export default function Projects() {
  const [loading, setLoadingState] = useState(false);
  const [projects, setProjects] = useState();
  const [errorState, setErrorState] = useState();

  const firestore = getFirestore();
  const projectsQuery = query(
    collection(firestore, 'public_projects'),
    limit(10),
  );

  const loadProjects = useCallback(() => {
    setLoadingState(true);
    return onSnapshot(
      projectsQuery,
      (snap) => {
        setProjects(
          snap.docs.map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          })),
        );
        setLoadingState(false);
      },
      (err) => {
        setErrorState(err?.toString ? err.toString() : err);
        setLoadingState(false);
      },
    );
  }, [projectsQuery, setLoadingState, setProjects, setErrorState]);

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
        <Project
          key={`Project-${projectKey}`}
          project={project}
          projectId={projectKey}
        />
      ))}
    </div>
  );
}

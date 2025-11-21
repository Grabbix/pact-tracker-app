import { useState, useEffect } from 'react';
import { Project, ProjectType, ProjectStatus } from '@/types/project';
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:3001/api';

export const useProjects = (includeArchived: boolean = false) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/projects?includeArchived=${includeArchived}`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [includeArchived]);

  const addProject = async (projectData: {
    clientId: string;
    projectType: ProjectType;
    status: ProjectStatus;
    title: string;
    description?: string;
  }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) throw new Error('Failed to create project');
      
      toast.success('Projet créé avec succès');
      await fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Erreur lors de la création du projet');
      throw error;
    }
  };

  const updateProject = async (
    projectId: string,
    updates: {
      projectType?: ProjectType;
      status?: ProjectStatus;
      title?: string;
      description?: string;
    }
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update project');
      
      toast.success('Projet mis à jour');
      await fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Erreur lors de la mise à jour du projet');
      throw error;
    }
  };

  const archiveProject = async (projectId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/archive`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to archive project');
      
      toast.success('Projet archivé');
      await fetchProjects();
    } catch (error) {
      console.error('Error archiving project:', error);
      toast.error('Erreur lors de l\'archivage du projet');
      throw error;
    }
  };

  const unarchiveProject = async (projectId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/unarchive`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to unarchive project');
      
      toast.success('Projet désarchivé');
      await fetchProjects();
    } catch (error) {
      console.error('Error unarchiving project:', error);
      toast.error('Erreur lors du désarchivage du projet');
      throw error;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete project');
      
      toast.success('Projet supprimé');
      await fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Erreur lors de la suppression du projet');
      throw error;
    }
  };

  const addNote = async (projectId: string, note: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });

      if (!response.ok) throw new Error('Failed to add note');
      
      toast.success('Note ajoutée');
      await fetchProjects();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Erreur lors de l\'ajout de la note');
      throw error;
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/project-notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete note');
      
      toast.success('Note supprimée');
      await fetchProjects();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Erreur lors de la suppression de la note');
      throw error;
    }
  };

  const getProject = (projectId: string) => {
    return projects.find(p => p.id === projectId);
  };

  return {
    projects,
    loading,
    addProject,
    updateProject,
    archiveProject,
    unarchiveProject,
    deleteProject,
    addNote,
    deleteNote,
    getProject,
    refetch: fetchProjects,
  };
};

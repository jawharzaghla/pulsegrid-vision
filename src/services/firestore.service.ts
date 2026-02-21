// ============================================
// PulseGrid — Firestore Service
// CRUD for projects and widgets
// ============================================

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project, ProjectTheme, Widget, LayoutItem } from '@/types/models';

const PROJECTS_COLLECTION = 'projects';

// =====================
// PROJECT CRUD
// =====================

/**
 * Create a new project for the given user.
 */
export async function createProject(
    userId: string,
    data: { name: string; description: string; emoji: string; accentColor: string }
): Promise<string> {
    const now = new Date().toISOString();
    const project: Omit<Project, 'id'> = {
        userId,
        name: data.name,
        description: data.description,
        emoji: data.emoji,
        accentColor: data.accentColor,
        theme: {
            mode: 'dark',
            chartPalette: 'default',
            fontSize: 'comfortable',
            widgetBorder: 'card',
        },
        widgets: [],
        layout: [],
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), project);
    return docRef.id;
}

/**
 * Get all projects for a user.
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
    // WORKAROUND: We fetch by userId only and sort in memory 
    // to avoid requiring a composite index for (userId == '...' && orderBy updatedAt).
    const q = query(
        collection(db, PROJECTS_COLLECTION),
        where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const projects = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
    })) as Project[];

    // Sort by updatedAt descending
    return projects.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

/**
 * Get a single project by ID.
 */
export async function getProject(projectId: string): Promise<Project | null> {
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { ...snapshot.data(), id: snapshot.id } as Project;
}

/**
 * Update a project's basic info.
 */
export async function updateProject(
    projectId: string,
    data: Partial<Pick<Project, 'name' | 'description' | 'emoji' | 'accentColor' | 'theme'>>
): Promise<void> {
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Delete a project.
 */
export async function deleteProject(projectId: string): Promise<void> {
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    await deleteDoc(docRef);
}

// =====================
// WIDGET CRUD
// =====================

/**
 * Add a widget to a project.
 */
export async function addWidget(projectId: string, widget: Omit<Widget, 'id' | 'projectId'>): Promise<void> {
    const project = await getProject(projectId);
    if (!project) throw new Error('Project not found');

    const newWidget: Widget = {
        ...widget,
        id: crypto.randomUUID(),
        projectId,
    };

    const updatedWidgets = [...project.widgets, newWidget];
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(docRef, {
        widgets: updatedWidgets,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Update a widget within a project.
 */
export async function updateWidget(projectId: string, widgetId: string, data: Partial<Widget>): Promise<void> {
    const project = await getProject(projectId);
    if (!project) throw new Error('Project not found');

    const updatedWidgets = project.widgets.map((w) =>
        w.id === widgetId ? { ...w, ...data } : w
    );
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(docRef, {
        widgets: updatedWidgets,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Delete a widget from a project.
 */
export async function deleteWidget(projectId: string, widgetId: string): Promise<void> {
    const project = await getProject(projectId);
    if (!project) throw new Error('Project not found');

    const updatedWidgets = project.widgets.filter((w) => w.id !== widgetId);
    const updatedLayout = project.layout.filter((l) => l.widgetId !== widgetId);
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(docRef, {
        widgets: updatedWidgets,
        layout: updatedLayout,
        updatedAt: new Date().toISOString(),
    });
}

// =====================
// LAYOUT
// =====================

/**
 * Save the dashboard layout for a project.
 */
export async function saveLayout(projectId: string, layout: LayoutItem[]): Promise<void> {
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(docRef, {
        layout,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Update project theme settings.
 */
export async function updateProjectTheme(projectId: string, theme: ProjectTheme): Promise<void> {
    const docRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(docRef, {
        theme,
        updatedAt: new Date().toISOString(),
    });
}

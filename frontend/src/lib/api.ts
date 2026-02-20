const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface FetchOptions extends RequestInit {
    body?: string;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const config: RequestInit = {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
}

// Auth API
export const authAPI = {
    register: (email: string, password: string) =>
        apiFetch<{ user: User; token: string }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    login: (email: string, password: string) =>
        apiFetch<{ user: User; token: string }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    logout: () =>
        apiFetch<{ message: string }>('/auth/logout', { method: 'POST' }),

    getMe: () =>
        apiFetch<{ user: User }>('/auth/me'),
};

// Task API
export const taskAPI = {
    getAll: (params?: TaskQueryParams) => {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.set('status', params.status);
        if (params?.priority) searchParams.set('priority', params.priority);
        if (params?.due_date) searchParams.set('due_date', params.due_date);
        if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
        if (params?.order) searchParams.set('order', params.order);

        const query = searchParams.toString();
        return apiFetch<{ tasks: Task[] }>(`/tasks${query ? `?${query}` : ''}`);
    },

    getById: (id: string) =>
        apiFetch<{ task: Task }>(`/tasks/${id}`),

    create: (data: CreateTaskData) =>
        apiFetch<{ task: Task }>('/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: UpdateTaskData) =>
        apiFetch<{ task: Task }>(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiFetch<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),
};

// Types
export interface User {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export interface Task {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    status: 'todo' | 'in_progress' | 'done';
    due_date: string | null;
    priority: 'low' | 'medium' | 'high';
    created_at: string;
    updated_at: string;
}

export interface CreateTaskData {
    title: string;
    description?: string;
    status?: string;
    due_date?: string;
    priority?: string;
}

export interface UpdateTaskData {
    title?: string;
    description?: string;
    status?: string;
    due_date?: string;
    priority?: string;
}

export interface TaskQueryParams {
    status?: string;
    priority?: string;
    due_date?: string;
    sort_by?: string;
    order?: string;
}

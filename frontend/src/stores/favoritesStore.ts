import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteRequest {
    id: string;
    name: string;
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: string;
    createdAt: string;
    lastResponse?: {
        status: number;
        headers: Record<string, string>;
        body: any;
    };
}

interface FavoritesState {
    favorites: FavoriteRequest[];
    addFavorite: (favorite: Omit<FavoriteRequest, 'id' | 'createdAt'>) => void;
    removeFavorite: (id: string) => void;
    updateFavorite: (id: string, favorite: Partial<FavoriteRequest>) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set) => ({
            favorites: [],
            addFavorite: (favorite) => set((state) => ({
                favorites: [
                    ...state.favorites,
                    {
                        ...favorite,
                        id: `fav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        createdAt: new Date().toISOString()
                    }
                ]
            })),
            removeFavorite: (id) => set((state) => ({
                favorites: state.favorites.filter((f) => f.id !== id)
            })),
            updateFavorite: (id, favorite) => set((state) => ({
                favorites: state.favorites.map((f) => 
                    f.id === id ? { ...f, ...favorite } : f
                )
            }))
        }),
        {
            name: 'favorites-storage'
        }
    )
); 
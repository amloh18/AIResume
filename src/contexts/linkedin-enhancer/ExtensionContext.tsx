'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface ExtensionState {
    isConnected: boolean;
    isInjecting: boolean;
    lastSyncTime: string | null;
    error: string | null;
}

const initialExtensionState: ExtensionState = {
    isConnected: false,
    isInjecting: false,
    lastSyncTime: null,
    error: null,
};

type Action =
    | { type: 'SET_CONNECTED'; payload: boolean }
    | { type: 'SET_INJECTING'; payload: boolean }
    | { type: 'SET_LAST_SYNC_TIME'; payload: string }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'RESET_STATE' };

function reducer(state: ExtensionState, action: Action): ExtensionState {
    switch (action.type) {
        case 'SET_CONNECTED': return { ...state, isConnected: action.payload };
        case 'SET_INJECTING': return { ...state, isInjecting: action.payload };
        case 'SET_LAST_SYNC_TIME': return { ...state, lastSyncTime: action.payload };
        case 'SET_ERROR': return { ...state, error: action.payload };
        case 'RESET_STATE': return initialExtensionState;
        default: return state;
    }
}

export interface ExtensionContextType {
    state: ExtensionState;
    dispatch: React.Dispatch<Action>;
    connect: () => void;
    disconnect: () => void;
}

const ExtensionContext = createContext<ExtensionContextType | null>(null);

export function ExtensionProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialExtensionState);

    const connect = () => {
        // Mock connection logic for now
        dispatch({ type: 'SET_CONNECTED', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
    };

    const disconnect = () => {
        dispatch({ type: 'SET_CONNECTED', payload: false });
    };

    return (
        <ExtensionContext.Provider value={{ state, dispatch, connect, disconnect }}>
            {children}
        </ExtensionContext.Provider>
    );
}

export function useExtension() {
    const context = useContext(ExtensionContext);
    if (!context) throw new Error('useExtension must be used within ExtensionProvider');
    return context;
}

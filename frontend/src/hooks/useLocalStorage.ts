import { useState, useEffect } from 'react';
import { serializeEvent, deserializeEvent, serializeTodo, deserializeTodo } from '@/lib/utils';
import { CalendarEvent, Todo } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/constants';

// Generic local storage hook
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
	// State to store our value
	const [storedValue, setStoredValue] = useState<T>(() => {
		try {
			// Get from local storage by key
			const item = window.localStorage.getItem(key);
			// Parse stored json or if none return initialValue
			return item ? JSON.parse(item) : initialValue;
		} catch (error) {
			// If error also return initialValue
			console.error(error);
			return initialValue;
		}
	});

	// Return a wrapped version of useState's setter function that
	// persists the new value to localStorage.
	const setValue = (value: T) => {
		try {
			// Allow value to be a function so we have same API as useState
			const valueToStore = value instanceof Function ? value(storedValue) : value;
			// Save state
			setStoredValue(valueToStore);
			// Save to local storage
			window.localStorage.setItem(key, JSON.stringify(valueToStore));
		} catch (error) {
			// A more advanced implementation would handle the error case
			console.error(error);
		}
	};

	return [storedValue, setValue];
}

// Hook for events with serialization/deserialization
export function useEventsStorage(): [
	CalendarEvent[],
	(events: CalendarEvent[]) => void,
	(event: CalendarEvent) => void,
	(id: string) => void
] {
	const [serializedEvents, setSerializedEvents] = useLocalStorage<any[]>(STORAGE_KEYS.EVENTS, []);
	const [events, setEvents] = useState<CalendarEvent[]>([]);

	// Deserialize events on initial load
	useEffect(() => {
		const deserializedEvents = serializedEvents.map(deserializeEvent);
		setEvents(deserializedEvents);
	}, [serializedEvents]);

	// Save all events
	const saveEvents = (newEvents: CalendarEvent[]) => {
		const serialized = newEvents.map(serializeEvent);
		setSerializedEvents(serialized);
		setEvents(newEvents);
	};

	// Add or update a single event
	const saveEvent = (event: CalendarEvent) => {
		const index = events.findIndex(e => e.id === event.id);
		const updatedEvents = [...events];

		if (index >= 0) {
			updatedEvents[index] = { ...event, updatedAt: new Date() };
		} else {
			updatedEvents.push(event);
		}

		saveEvents(updatedEvents);
	};

	// Delete an event
	const deleteEvent = (id: string) => {
		const updatedEvents = events.filter(event => event.id !== id);
		saveEvents(updatedEvents);
	};

	return [events, saveEvents, saveEvent, deleteEvent];
}

// Hook for todos with serialization/deserialization
export function useTasksStorage(): [
	Todo[],
	(todos: Todo[]) => void,
	(todo: Todo) => void,
	(id: string) => void
] {
	const [serializedTodos, setSerializedTodos] = useLocalStorage<any[]>(STORAGE_KEYS.TODOS, []);
	const [todos, setTodos] = useState<Todo[]>([]);

	// Deserialize todos on initial load
	useEffect(() => {
		const deserializedTodos = serializedTodos.map(deserializeTodo);
		setTodos(deserializedTodos);
	}, [serializedTodos]);

	// Save all todos
	const saveTodos = (newTodos: Todo[]) => {
		const serialized = newTodos.map(serializeTodo);
		setSerializedTodos(serialized);
		setTodos(newTodos);
	};

	// Add or update a single todo
	const saveTodo = (todo: Todo) => {
		const index = todos.findIndex(t => t.id === todo.id);
		const updatedTodos = [...todos];

		if (index >= 0) {
			updatedTodos[index] = todo;
		} else {
			updatedTodos.push(todo);
		}

		saveTodos(updatedTodos);
	};

	// Delete a todo
	const deleteTodo = (id: string) => {
		const updatedTodos = todos.filter(todo => todo.id !== id);
		saveTodos(updatedTodos);
	};

	return [todos, saveTodos, saveTodo, deleteTodo];
}

export default useLocalStorage;

import { useState, useEffect } from 'react';
import { useApiClient } from '../utils/ApiClient';

export const useConversations = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const { apiCall } = useApiClient();

    const fetchConversations = async () => {
        setLoading(true);
        
        try {
            const response = await apiCall('/api/v1/rooms/conversations', {
                method: 'GET',
                requiresAuth: true,
            });

            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations || []);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch conversations');
            }
        } catch (err) {
            console.error('Error fetching conversations:', err);
                    } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    return {
        conversations,
        loading,
        refetch: fetchConversations
    };
};
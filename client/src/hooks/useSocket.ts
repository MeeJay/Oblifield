import { useEffect } from 'react';
import { getSocket } from '../socket/socketClient';
import { useInterventionStore } from '../store/interventionStore';
import { useClientStore } from '../store/clientStore';
import { useAuthStore } from '../store/authStore';
import { useLiveAlertsStore } from '../store/liveAlertsStore';
import { SOCKET_EVENTS } from '@oblifield/shared';
import type { Intervention, Client, TimelineEvent, LiveAlertData } from '@oblifield/shared';

export function useSocket() {
  const { user } = useAuthStore();
  const { addIntervention, updateIntervention, removeIntervention, addTimelineEvent } = useInterventionStore();
  const { addClient, updateClient, removeClient, fetchTree } = useClientStore();

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    if (!socket) return;

    // ── Live alert (NOTIFICATION_NEW) ─────────────────────────────────────────
    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, (alert: LiveAlertData) => {
      useLiveAlertsStore.getState().addAlertFromServer(alert);
    });

    // ── Intervention events ──────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.INTERVENTION_CREATED, (data: { intervention: Intervention }) => {
      addIntervention(data.intervention);
    });
    socket.on(SOCKET_EVENTS.INTERVENTION_UPDATED, (data: { interventionId: number; changes: Partial<Intervention> }) => {
      updateIntervention(data.interventionId, data.changes);
    });
    socket.on(SOCKET_EVENTS.INTERVENTION_DELETED, (data: { interventionId: number }) => {
      removeIntervention(data.interventionId);
    });
    socket.on(SOCKET_EVENTS.INTERVENTION_STATUS_CHANGE, (data: { interventionId: number; newStatus: string }) => {
      updateIntervention(data.interventionId, { status: data.newStatus as Intervention['status'] });
    });

    // ── Timeline events ──────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.TIMELINE_EVENT_CREATED, (data: { interventionId: number; event: TimelineEvent }) => {
      addTimelineEvent(data.interventionId, data.event);
    });

    // ── Client events ────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.CLIENT_CREATED, (data: { client: Client }) => {
      addClient(data.client);
      fetchTree();
    });
    socket.on(SOCKET_EVENTS.CLIENT_UPDATED, (data: { client: Client }) => {
      updateClient(data.client.id, data.client);
      fetchTree();
    });
    socket.on(SOCKET_EVENTS.CLIENT_DELETED, (data: { clientId: number }) => {
      removeClient(data.clientId);
      fetchTree();
    });

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW);
      socket.off(SOCKET_EVENTS.INTERVENTION_CREATED);
      socket.off(SOCKET_EVENTS.INTERVENTION_UPDATED);
      socket.off(SOCKET_EVENTS.INTERVENTION_DELETED);
      socket.off(SOCKET_EVENTS.INTERVENTION_STATUS_CHANGE);
      socket.off(SOCKET_EVENTS.TIMELINE_EVENT_CREATED);
      socket.off(SOCKET_EVENTS.CLIENT_CREATED);
      socket.off(SOCKET_EVENTS.CLIENT_UPDATED);
      socket.off(SOCKET_EVENTS.CLIENT_DELETED);
    };
  }, [user, addIntervention, updateIntervention, removeIntervention, addTimelineEvent, addClient, updateClient, removeClient, fetchTree]);
}

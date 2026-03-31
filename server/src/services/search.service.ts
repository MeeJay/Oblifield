import { db } from '../db';
import type { SearchResult } from '@oblifield/shared';

export const searchService = {
  async search(tenantId: number, query: string, limit = 20): Promise<SearchResult[]> {
    const term = `%${query}%`;
    const results: SearchResult[] = [];

    // Search interventions
    const interventions = await db('interventions')
      .where('tenant_id', tenantId)
      .where(function () {
        this.whereILike('title', term)
          .orWhereILike('description', term)
          .orWhereILike('address', term)
          .orWhereILike('ticket_reference', term);
      })
      .select('id', 'title', 'status')
      .limit(limit);

    for (const row of interventions) {
      results.push({
        type: 'intervention',
        id: row.id,
        title: row.title,
        subtitle: row.status,
        url: `/intervention/${row.id}`,
      });
    }

    // Search clients
    const clients = await db('clients')
      .where('tenant_id', tenantId)
      .where(function () {
        this.whereILike('name', term)
          .orWhereILike('contact_name', term);
      })
      .select('id', 'name')
      .limit(limit);

    for (const row of clients) {
      results.push({
        type: 'client',
        id: row.id,
        title: row.name,
        subtitle: null,
        url: `/client/${row.id}`,
      });
    }

    // Search sites
    const sites = await db('sites')
      .where('tenant_id', tenantId)
      .where(function () {
        this.whereILike('name', term)
          .orWhereILike('address', term)
          .orWhereILike('city', term);
      })
      .select('id', 'name', 'city')
      .limit(limit);

    for (const row of sites) {
      results.push({
        type: 'site',
        id: row.id,
        title: row.name,
        subtitle: row.city,
        url: `/client/${row.id}`, // sites don't have their own page, link to client
      });
    }

    // Search technicians
    const technicians = await db('technicians')
      .where('tenant_id', tenantId)
      .where(function () {
        this.whereILike('first_name', term)
          .orWhereILike('last_name', term)
          .orWhereILike('company', term)
          .orWhereILike('email', term);
      })
      .select('id', 'first_name', 'last_name', 'company')
      .limit(limit);

    for (const row of technicians) {
      results.push({
        type: 'technician',
        id: row.id,
        title: `${row.first_name} ${row.last_name}`,
        subtitle: row.company,
        url: `/technicians/${row.id}`,
      });
    }

    // Search documents
    const documents = await db('documents')
      .where('tenant_id', tenantId)
      .where(function () {
        this.whereILike('title', term)
          .orWhereILike('content', term);
      })
      .select('id', 'title')
      .limit(limit);

    for (const row of documents) {
      results.push({
        type: 'document',
        id: row.id,
        title: row.title,
        subtitle: null,
        url: `/docs/${row.id}`,
      });
    }

    return results.slice(0, limit);
  },
};

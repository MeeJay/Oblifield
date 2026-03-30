import { Link } from 'react-router-dom';
import type { ClientTreeNode } from '@oblifield/shared';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  tree: ClientTreeNode[];
  collapsedIds: Set<number>;
  onToggle: (id: number) => void;
}

function ClientNodeItem({
  node,
  depth,
  collapsedIds,
  onToggle,
}: {
  node: ClientTreeNode;
  depth: number;
  collapsedIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);

  return (
    <div>
      <div
        className="flex items-center gap-1 rounded-md text-sm transition-colors hover:bg-bg-hover"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {/* Expand / collapse toggle */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:text-text-primary"
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform',
                !isCollapsed && 'rotate-90',
              )}
            />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}

        {/* Client link */}
        <Link
          to={`/client/${node.id}`}
          className="flex flex-1 items-center gap-2 py-1 pr-2 text-text-secondary hover:text-text-primary truncate"
        >
          <span className="truncate">{node.name}</span>
          {node.interventionCount > 0 && (
            <span className="ml-auto shrink-0 inline-flex items-center rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
              {node.interventionCount}
            </span>
          )}
        </Link>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div>
          {node.children.map((child) => (
            <ClientNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientTree({ tree, collapsedIds, onToggle }: Props) {
  if (tree.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-text-muted">
        No clients yet
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <ClientNodeItem
          key={node.id}
          node={node}
          depth={0}
          collapsedIds={collapsedIds}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

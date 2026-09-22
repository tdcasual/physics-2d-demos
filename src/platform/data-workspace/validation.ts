type DataWorkspaceSpec = {
  id: string;
  rowFields: readonly {
    id: string;
    dependsOn?: readonly { field: string }[];
  }[];
  summaryFields: readonly {
    id: string;
    dependsOn?: readonly { field: string }[];
  }[];
};

/** Validate that dependency edges cannot recursively invalidate themselves. */
export function assertAcyclicDependencies(spec: DataWorkspaceSpec): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const findField = (id: string) =>
    spec.rowFields.find((field) => field.id === id) ??
    spec.summaryFields.find((field) => field.id === id);
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(
        `[data-workspace] cyclic field dependencies involving "${id}" in spec "${spec.id}"`
      );
    }
    visiting.add(id);
    for (const dependency of findField(id)?.dependsOn ?? []) {
      visit(dependency.field);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const field of [...spec.rowFields, ...spec.summaryFields]) {
    visit(field.id);
  }
}

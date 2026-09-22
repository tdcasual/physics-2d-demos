type DataWorkspacePanelStep = 'data' | 'chartAnalysis';

export function buildWorkspaceStepTabs(options: {
  signal: AbortSignal;
  setStep(step: DataWorkspacePanelStep): void;
}): {
  element: HTMLDivElement;
  dataTab: HTMLButtonElement;
  chartTab: HTMLButtonElement;
} {
  const steps = document.createElement('div');
  steps.className = 'data-workspace-steps';
  steps.setAttribute('role', 'tablist');
  steps.setAttribute('aria-label', '工作区步骤');
  const dataTab = document.createElement('button');
  dataTab.type = 'button';
  dataTab.className = 'data-workspace-step';
  dataTab.setAttribute('role', 'tab');
  dataTab.dataset.step = 'data';
  dataTab.textContent = '1 数据处理';
  const chartTab = document.createElement('button');
  chartTab.type = 'button';
  chartTab.className = 'data-workspace-step';
  chartTab.setAttribute('role', 'tab');
  chartTab.dataset.step = 'chartAnalysis';
  chartTab.textContent = '2 图像分析';
  dataTab.addEventListener('click', () => options.setStep('data'), {
    signal: options.signal
  });
  chartTab.addEventListener('click', () => options.setStep('chartAnalysis'), {
    signal: options.signal
  });
  steps.append(dataTab, chartTab);
  return { element: steps, dataTab, chartTab };
}

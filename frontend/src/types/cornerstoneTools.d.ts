declare module '@cornerstonejs/tools' {
  export interface ToolBinding {
    bindings: {
      mouseButton?: number;
      modifierKey?: string;
    };
  }

  export interface ToolGroup {
    addTool(toolName: string): void;
    setToolActive(toolName: string, bindings?: ToolBinding): void;
  }

  export const ToolGroupManager: {
    createToolGroup(name: string): ToolGroup;
  };

  export const Tools: {
    WindowLevelTool: { toolName: string };
    PanTool: { toolName: string };
    ZoomTool: { toolName: string };
    StackScrollMouseWheelTool: { toolName: string };
  };
} 
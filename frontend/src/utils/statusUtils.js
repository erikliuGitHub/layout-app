// utils/statusUtils.js
export const calculateStatus = (item) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 設置為當天開始時間

  // 如果項目已關閉，直接返回 Closed
  if (item.layoutClosed) {
    return "Closed";
  }

  // 如果沒有指定設計師，返回 Unassigned
  if (!item.designer) {
    return "Unassigned";
  }

  // 如果沒有 Schematic Freeze 日期，返回 Waiting for Freeze
  if (!item.schematicFreeze) {
    return "Waiting for Freeze";
  }

  // 如果 Schematic Freeze 日期還沒到，返回 Waiting for Freeze
  if (new Date(item.schematicFreeze) > today) {
    return "Waiting for Freeze";
  }

  // 如果 LVS Clean 日期已過期，返回 Postim
  if (item.lvsClean && new Date(item.lvsClean) < today) {
    return "Postim";
  }

  // 如果有 LVS Clean 日期且未過期，返回 In Progress
  if (item.lvsClean && new Date(item.lvsClean) >= today) {
    return "In Progress";
  }

  // 如果有 Schematic Freeze 日期但沒有 LVS Clean 日期，返回 In Progress
  return "In Progress";
};

// 添加響應式布局類
const responsiveStyles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    gap: '20px',
    '@media (max-width: 1024px)': {
      flexDirection: 'column'
    }
  },
  sidebar: {
    width: '300px',
    '@media (max-width: 1024px)': {
      width: '100%'
    }
  },
  main: {
    flex: 1,
    '@media (max-width: 1024px)': {
      width: '100%'
    }
  }
};

// 時間軸樣式優化
const timelineStyles = {
  header: {
    background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
    borderBottom: '2px solid #e2e8f0',
    padding: '12px 0'
  },
  timeUnit: {
    minWidth: '80px',
    textAlign: 'center',
    padding: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    borderRight: '1px solid #e2e8f0',
    background: '#ffffff',
    transition: 'all 0.2s ease'
  },
  currentTime: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeft: '2px solid #ef4444',
    boxShadow: '0 0 8px rgba(239, 68, 68, 0.3)',
    zIndex: 5
  },
  weekend: {
    background: '#f8fafc'
  }
};

// 任務條視覺優化
const taskBarStyles = {
  container: {
    position: 'relative',
    height: '90px',
    padding: '8px 0',
    transition: 'all 0.3s ease'
  },
  bar: {
    position: 'absolute',
    height: '20px',
    borderRadius: '6px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    transition: 'width 0.3s ease'
  },
  label: {
    position: 'absolute',
    left: '8px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#ffffff',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
  }
};

// 整體容器樣式
const containerStyles = {
  container: {
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '24px',
    margin: '20px',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '0 16px'
  }
};

// 狀態標識樣式
const statusStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '4px'
  },
  status: {
    completed: {
      background: '#10b981',
      color: '#ffffff'
    },
    inProgress: {
      background: '#f59e0b',
      color: '#ffffff'
    },
    delayed: {
      background: '#ef4444',
      color: '#ffffff'
    },
    notStarted: {
      background: '#94a3b8',
      color: '#ffffff'
    }
  }
};

// 工具提示樣式
const tooltipStyles = {
  container: {
    position: 'absolute',
    background: '#ffffff',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 1000,
    minWidth: '200px'
  },
  header: {
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '8px',
    marginBottom: '8px'
  },
  content: {
    fontSize: '14px',
    color: '#475569',
    lineHeight: '1.5'
  },
  arrow: {
    position: 'absolute',
    width: '10px',
    height: '10px',
    background: '#ffffff',
    transform: 'rotate(45deg)',
    boxShadow: '-2px -2px 5px rgba(0, 0, 0, 0.06)'
  }
};

// 添加動畫效果
const animationStyles = {
  fadeIn: {
    animation: 'fadeIn 0.3s ease-in-out'
  },
  slideIn: {
    animation: 'slideIn 0.3s ease-in-out'
  },
  scaleIn: {
    animation: 'scaleIn 0.3s ease-in-out'
  },
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to: { opacity: 1 }
  },
  '@keyframes slideIn': {
    from: { transform: 'translateY(10px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 }
  },
  '@keyframes scaleIn': {
    from: { transform: 'scale(0.95)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 }
  }
};

// 交互反饋樣式
const interactionStyles = {
  hover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease'
  },
  active: {
    transform: 'translateY(0)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  focus: {
    outline: '2px solid #3b82f6',
    outlineOffset: '2px'
  }
};

// 時間軸標題固定樣式
const timelineHeaderStyles = {
  container: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    background: '#ffffff',
    borderBottom: '2px solid #e2e8f0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
  },
  monthHeader: {
    background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: '600',
    color: '#1e293b'
  },
  weekHeader: {
    display: 'flex',
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0'
  },
  dayHeader: {
    minWidth: '60px',
    textAlign: 'center',
    padding: '8px 4px',
    fontSize: '14px',
    color: '#475569',
    borderRight: '1px solid #e2e8f0',
    position: 'relative'
  }
};

// 時間對齊輔助線
const timelineGridStyles = {
  container: {
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '200px', // 左側固定列的寬度
      borderLeft: '1px solid #e2e8f0',
      zIndex: 10
    }
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeft: '1px dashed #e2e8f0',
    zIndex: 5
  },
  currentTimeLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeft: '2px solid #ef4444',
    boxShadow: '0 0 8px rgba(239, 68, 68, 0.3)',
    zIndex: 15
  }
};
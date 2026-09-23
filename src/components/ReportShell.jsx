import React, { useState } from 'react';
import {
  Binary, Box, MapPin, LayoutGrid, Table2, ShieldCheck, BarChart3, BookOpen, GraduationCap, MessageSquare
} from 'lucide-react';
import ReportHeader from './ReportHeader';
import Sidebar from './Sidebar';
import TechProfileTab from './tabs/TechProfileTab';
import ICViewer3DTab from './tabs/ICViewer3DTab';
import PinTopologyTab from './tabs/PinTopologyTab';
import BreadboardTab from './tabs/BreadboardTab';
import TruthTableTab from './tabs/TruthTableTab';
import DiagnosticsTab from './tabs/DiagnosticsTab';
import MarketTab from './tabs/MarketTab';
import ResearchTab from './tabs/ResearchTab';
import VivaTab from './tabs/VivaTab';
import ChatPanel from './ChatPanel';

const TABS = [
  { id: 'specs', label: 'Specifications', icon: Binary },
  { id: '3d', label: '3D Viewer', icon: Box },
  { id: 'pinout', label: 'Pinout', icon: MapPin },
  { id: 'breadboard', label: 'Breadboard', icon: LayoutGrid },
  { id: 'truth', label: 'Truth Table', icon: Table2 },
  { id: 'diagnostics', label: 'Diagnostics', icon: ShieldCheck },
  { id: 'market', label: 'Market', icon: BarChart3 },
  { id: 'research', label: 'Research', icon: BookOpen },
  { id: 'viva', label: 'Viva Mode', icon: GraduationCap },
];

export default function ReportShell({ report, image, onNewScan, onPdf, onLabPdf, isGenerating, chatOpen, setChatOpen }) {
  const [activeTab, setActiveTab] = useState('specs');

  const renderTab = () => {
    switch (activeTab) {
      case 'specs': return <TechProfileTab data={report.technicalProfile} />;
      case '3d': return <ICViewer3DTab report={report} />;
      case 'pinout': return <PinTopologyTab report={report} pinout={report.pinout} />;
      case 'breadboard': return <BreadboardTab steps={report.breadboardGuide} icName={report.identification.name} report={report} />;
      case 'truth': return <TruthTableTab logicInfo={report.logicInfo} />;
      case 'diagnostics': return <DiagnosticsTab testing={report.testing} />;
      case 'market': return <MarketTab market={report.marketPrice} crossRefs={report.crossReferences} />;
      case 'research': return <ResearchTab report={report} />;
      case 'viva': return <VivaTab report={report} />;
      default: return null;
    }
  };

  return (<>
    <div className="animate-fade-up">
      <ReportHeader report={report} onNewScan={onNewScan} onPdf={onPdf} onLabPdf={onLabPdf} isGenerating={isGenerating} />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-72 shrink-0 space-y-4 no-print">
          <Sidebar image={image} report={report} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Tab bar */}
          <div className="card overflow-hidden no-print">
            <div className="flex w-full overflow-x-auto custom-scroll">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-1 justify-center items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all shrink-0 ${
                      active
                        ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="card p-4 sm:p-6">
            {renderTab()}
          </div>
        </div>
      </div>
    </div> {/* <-- THIS CLOSES THE animate-fade-up DIV */}

    {/* =========================================================
        MOVE CHAT FAB OUTSIDE THE ANIMATED DIV SO "FIXED" WORKS 
        ========================================================= */}
    {!chatOpen && (
      <button 
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-primary-700 hover:scale-110 transition-all duration-200"
      >
        <MessageSquare size={24} />
      </button>
    )}

    <ChatPanel
      open={chatOpen}
      onClose={() => setChatOpen(false)}
      report={report}
    />
  </>
  );
}
// Demo data for MCP server - simulates real sales intelligence data

export interface DemoPlay {
  id: number;
  name: string;
  genericPlayType: string;
  description: string;
  playbook: { name: string };
  solution: { name: string };
  segment?: { name: string };
}

export interface DemoCompetitor {
  name: string;
  talkingPoints: string[];
  sources: Array<{
    type: 'play' | 'content';
    id: number;
    name: string;
  }>;
}

export interface DemoWorkflow {
  id: number;
  name: string;
  description: string;
  processInfo: {
    processType: string;
    steps: string[];
    roles: string[];
  };
  solution: { name: string };
}

export interface DemoPlaybook {
  id: number;
  name: string;
  description: string;
  playCount: number;
  playTypes: string[];
  solution: { name: string };
  segment?: { name: string };
}

export const demoPlays: DemoPlay[] = [
  {
    id: 1,
    name: "Account Verification Discovery",
    genericPlayType: "DISCOVERY",
    description: "Essential discovery questions to understand client's current account verification process, pain points, and requirements. Focus on transaction volume, verification methods, false positive rates, and integration capabilities.",
    playbook: { name: "Enterprise Banking Playbook" },
    solution: { name: "Account Verification" },
    segment: { name: "Enterprise" }
  },
  {
    id: 2,
    name: "Real-time Fraud Detection Demo",
    genericPlayType: "DEMO",
    description: "Technical demonstration showcasing real-time fraud detection capabilities, API integration, and dashboard functionality. Include comparison of detection speed vs batch processing competitors.",
    playbook: { name: "Fraud Prevention Playbook" },
    solution: { name: "Fraud Prevention" },
    segment: { name: "Enterprise" }
  },
  {
    id: 3,
    name: "Payment Processing ROI Calculator",
    genericPlayType: "VALUE_PROPOSITION",
    description: "ROI analysis tool showing cost savings from improved transaction success rates, reduced false positives, and faster processing times for payment solutions.",
    playbook: { name: "Payment Solutions Playbook" },
    solution: { name: "Payment Processing" },
    segment: { name: "Mid-Market" }
  },
  {
    id: 4,
    name: "EWS Competitive Positioning",
    genericPlayType: "COMPETITIVE_POSITIONING",
    description: "Battle card for competing against Early Warning System (EWS). Focus on real-time capabilities, API flexibility, and better false positive rates.",
    playbook: { name: "Enterprise Banking Playbook" },
    solution: { name: "Account Verification" },
    segment: { name: "Enterprise" }
  },
  {
    id: 5,
    name: "Account Verification POC Process",
    genericPlayType: "PROCESS",
    description: "Step-by-step POC process for account verification: 1) Environment setup, 2) Data integration, 3) Model configuration, 4) Testing and validation, 5) Results analysis and reporting.",
    playbook: { name: "Technical Implementation Playbook" },
    solution: { name: "Account Verification" },
    segment: { name: "Enterprise" }
  },
  {
    id: 6,
    name: "Fintech Integration Deep Dive",
    genericPlayType: "TECHNICAL_DEEP_DIVE",
    description: "Technical deep dive into API integration for fintech companies. Covers authentication, webhooks, rate limiting, and error handling best practices.",
    playbook: { name: "Fintech Playbook" },
    solution: { name: "Payment Processing" },
    segment: { name: "SMB" }
  }
];

export const demoCompetitors: Record<string, DemoCompetitor> = {
  "Early Warning System": {
    name: "Early Warning System",
    talkingPoints: [
      "We provide real-time fraud detection while EWS uses batch processing with delays",
      "Our API is more flexible and developer-friendly than EWS legacy systems",
      "Better false positive rates mean fewer legitimate transactions get blocked",
      "Our machine learning models adapt faster to new fraud patterns",
      "Integration takes weeks not months compared to EWS implementations"
    ],
    sources: [
      { type: 'play', id: 4, name: 'EWS Competitive Positioning' },
      { type: 'content', id: 1, name: 'EWS Battle Card' }
    ]
  },
  "EWS": {
    name: "Early Warning System",
    talkingPoints: [
      "We provide real-time fraud detection while EWS uses batch processing with delays",
      "Our API is more flexible and developer-friendly than EWS legacy systems",
      "Better false positive rates mean fewer legitimate transactions get blocked"
    ],
    sources: [
      { type: 'play', id: 4, name: 'EWS Competitive Positioning' }
    ]
  },
  "Plaid": {
    name: "Plaid",
    talkingPoints: [
      "Our account verification is specifically designed for banking use cases",
      "Better fraud detection capabilities beyond just account verification",
      "More comprehensive risk assessment than Plaid's basic verification",
      "Enterprise-grade security and compliance features"
    ],
    sources: [
      { type: 'content', id: 2, name: 'Plaid Competitive Analysis' }
    ]
  },
  "Featurespace": {
    name: "Featurespace",
    talkingPoints: [
      "Our solution offers better integration flexibility than Featurespace ARIC",
      "More transparent machine learning models with explainable AI",
      "Lower false positive rates in payment processing scenarios",
      "Better real-time performance for high-volume transactions"
    ],
    sources: [
      { type: 'content', id: 3, name: 'Featurespace Battle Card' }
    ]
  }
};

export const demoWorkflows: DemoWorkflow[] = [
  {
    id: 1,
    name: "Account Verification POC",
    description: "1. Setup test environment and configure API endpoints\n2. Integrate with client's data sources\n3. Run validation tests with sample data\n4. Analyze results and provide recommendations",
    processInfo: {
      processType: "POC Validation",
      steps: [
        "Setup test environment and configure API endpoints",
        "Integrate with client's data sources",
        "Run validation tests with sample data",
        "Analyze results and provide recommendations"
      ],
      roles: ["Technical Lead", "Solutions Engineer", "Data Analyst"]
    },
    solution: { name: "Account Verification" }
  },
  {
    id: 2,
    name: "Fraud Prevention Implementation",
    description: "Full implementation process for fraud prevention solution including model training, integration testing, and production deployment.",
    processInfo: {
      processType: "Implementation",
      steps: [
        "Requirements gathering and system analysis",
        "Model training with client's historical data",
        "Integration development and testing",
        "Production deployment and monitoring setup"
      ],
      roles: ["Project Manager", "ML Engineer", "DevOps Engineer"]
    },
    solution: { name: "Fraud Prevention" }
  },
  {
    id: 3,
    name: "Payment Processing Onboarding",
    description: "Customer onboarding workflow for payment processing solutions with compliance and integration checkpoints.",
    processInfo: {
      processType: "Onboarding",
      steps: [
        "Compliance documentation review",
        "API key setup and authentication",
        "Integration testing and certification",
        "Go-live support and monitoring"
      ],
      roles: ["Customer Success Manager", "Technical Support", "Compliance Officer"]
    },
    solution: { name: "Payment Processing" }
  }
];

export const demoPlaybooks: DemoPlaybook[] = [
  {
    id: 1,
    name: "Enterprise Banking Playbook",
    description: "Comprehensive playbook for enterprise banking clients focusing on account verification and fraud prevention",
    playCount: 8,
    playTypes: ["DISCOVERY", "DEMO", "VALUE_PROPOSITION", "COMPETITIVE_POSITIONING"],
    solution: { name: "Account Verification" },
    segment: { name: "Enterprise" }
  },
  {
    id: 2,
    name: "Fintech Playbook",
    description: "Playbook tailored for fintech companies and payment processors",
    playCount: 6,
    playTypes: ["TECHNICAL_DEEP_DIVE", "DEMO", "INTEGRATION_GUIDE"],
    solution: { name: "Payment Processing" },
    segment: { name: "SMB" }
  },
  {
    id: 3,
    name: "Fraud Prevention Playbook",
    description: "Specialized playbook for fraud detection and prevention across all market segments",
    playCount: 10,
    playTypes: ["DISCOVERY", "DEMO", "VALUE_PROPOSITION", "PROCESS"],
    solution: { name: "Fraud Prevention" },
    segment: { name: "Mid-Market" }
  }
];

// Utility functions for searching demo data
export function searchPlays(query: string, filters: any = {}): DemoPlay[] {
  const searchTerms = query.toLowerCase().split(' ');

  return demoPlays.filter(play => {
    // Text search
    const searchText = `${play.name} ${play.description} ${play.solution.name}`.toLowerCase();
    const textMatch = searchTerms.some(term => searchText.includes(term));

    // Apply filters
    let passesFilters = true;

    if (filters.solution && !play.solution.name.toLowerCase().includes(filters.solution.toLowerCase())) {
      passesFilters = false;
    }

    if (filters.segment && play.segment && !play.segment.name.toLowerCase().includes(filters.segment.toLowerCase())) {
      passesFilters = false;
    }

    if (filters.playType && play.genericPlayType !== filters.playType) {
      passesFilters = false;
    }

    return textMatch && passesFilters;
  });
}

export function findCompetitor(name: string): DemoCompetitor | null {
  // Try exact match first
  if (demoCompetitors[name]) {
    return demoCompetitors[name];
  }

  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  for (const [key, competitor] of Object.entries(demoCompetitors)) {
    if (key.toLowerCase() === lowerName || competitor.name.toLowerCase() === lowerName) {
      return competitor;
    }
  }

  return null;
}

export function searchWorkflows(processType: string, filters: any = {}): DemoWorkflow[] {
  return demoWorkflows.filter(workflow => {
    let matches = true;

    if (processType && !workflow.processInfo.processType.toLowerCase().includes(processType.toLowerCase())) {
      matches = false;
    }

    if (filters.solution && !workflow.solution.name.toLowerCase().includes(filters.solution.toLowerCase())) {
      matches = false;
    }

    return matches;
  });
}

export function searchPlaybooks(filters: any = {}): DemoPlaybook[] {
  return demoPlaybooks.filter(playbook => {
    let matches = true;

    if (filters.solution && !playbook.solution.name.toLowerCase().includes(filters.solution.toLowerCase())) {
      matches = false;
    }

    if (filters.segment && playbook.segment && !playbook.segment.name.toLowerCase().includes(filters.segment.toLowerCase())) {
      matches = false;
    }

    return matches;
  });
}
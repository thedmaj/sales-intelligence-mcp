import { findSalesContentTool } from '../src/tools/findSalesContent';
import { getCompetitiveIntelTool } from '../src/tools/getCompetitiveIntel';
import { findProcessWorkflowsTool } from '../src/tools/findProcessWorkflows';
import { discoverPlaybooksTool } from '../src/tools/discoverPlaybooks';
import { ApiClient } from '../src/auth/apiClient';

// Mock ApiClient
jest.mock('../src/auth/apiClient');
const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;

describe('MCP Tools', () => {
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockApiClient = new MockedApiClient({
      baseUrl: 'https://test.com',
      apiKey: 'test_key',
      timeout: 5000
    }) as jest.Mocked<ApiClient>;

    jest.clearAllMocks();
  });

  describe('findSalesContentTool', () => {
    it('should have correct tool definition', () => {
      expect(findSalesContentTool.name).toBe('find_sales_content');
      expect(findSalesContentTool.description).toContain('Search for playbooks, plays');
      expect(findSalesContentTool.inputSchema.properties.query).toBeDefined();
      expect(findSalesContentTool.inputSchema.required).toContain('query');
    });

    it('should handle successful search query', async () => {
      const mockApiResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              answer: 'Found 2 plays',
              confidence: 0.9,
              results: {
                plays: [
                  {
                    id: 1,
                    name: 'Account Verification Discovery',
                    genericPlayType: 'DISCOVERY',
                    description: 'Discovery questions for account verification',
                    playbook: { name: 'Banking Playbook' },
                    solution: { name: 'Account Verification' }
                  }
                ]
              },
              filters: { solutionId: 1 }
            },
            metadata: {
              queryTime: 150,
              resultCount: 1,
              cacheHit: false
            }
          })
        }]
      };

      mockApiClient.request.mockResolvedValue(mockApiResponse);

      const result = await findSalesContentTool.handler({
        query: 'account verification discovery',
        solution: 'Account Verification'
      }, mockApiClient);

      expect(mockApiClient.request).toHaveBeenCalledWith('/find_sales_content', {
        query: 'account verification discovery',
        solution: 'Account Verification',
        limit: 10,
        includeRelationships: false
      });

      expect(result).toContain('Sales Content Search Results');
      expect(result).toContain('Account Verification Discovery');
      expect(result).toContain('Discovery');
    });

    it('should handle no results gracefully', async () => {
      const mockApiResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              answer: 'No content found',
              results: { plays: [] },
              filters: {}
            },
            metadata: { queryTime: 50, resultCount: 0, cacheHit: false }
          })
        }]
      };

      mockApiClient.request.mockResolvedValue(mockApiResponse);

      const result = await findSalesContentTool.handler({
        query: 'nonexistent content'
      }, mockApiClient);

      expect(result).toContain('No Sales Content Found');
      expect(result).toContain('Try:');
    });

    it('should handle validation errors', async () => {
      const result = await findSalesContentTool.handler({
        // Missing required 'query' field
        limit: 5
      }, mockApiClient);

      expect(result).toContain('Invalid Input');
      expect(result).toContain('query');
    });

    it('should handle API errors', async () => {
      mockApiClient.request.mockRejectedValue(new Error('API Error'));

      await expect(findSalesContentTool.handler({
        query: 'test'
      }, mockApiClient))
        .rejects
        .toThrow('Search failed: API Error');
    });
  });

  describe('getCompetitiveIntelTool', () => {
    it('should have correct tool definition', () => {
      expect(getCompetitiveIntelTool.name).toBe('get_competitive_intel');
      expect(getCompetitiveIntelTool.description).toContain('competitive intelligence');
      expect(getCompetitiveIntelTool.inputSchema.properties.competitor).toBeDefined();
      expect(getCompetitiveIntelTool.inputSchema.required).toContain('competitor');
    });

    it('should handle successful competitive intelligence request', async () => {
      const mockApiResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            competitor: 'Early Warning System',
            intelligence: [{
              competitor: 'Early Warning System',
              talkingPoints: [
                'We provide better real-time fraud detection',
                'Our API is more flexible than EWS'
              ],
              sources: [
                { type: 'play', id: 1, name: 'EWS Competitive Play' },
                { type: 'content', id: 2, name: 'EWS Battle Card' }
              ]
            }],
            includeExamples: true
          })
        }]
      };

      mockApiClient.request.mockResolvedValue(mockApiResponse);

      const result = await getCompetitiveIntelTool.handler({
        competitor: 'Early Warning System',
        solution: 'Fraud Prevention'
      }, mockApiClient);

      expect(mockApiClient.request).toHaveBeenCalledWith('/get_competitive_intel', {
        competitor: 'Early Warning System',
        solution: 'Fraud Prevention',
        includeExamples: true
      });

      expect(result).toContain('Competitive Intelligence: Early Warning System');
      expect(result).toContain('2 talking points');
      expect(result).toContain('real-time fraud detection');
    });

    it('should handle competitor not found', async () => {
      mockApiClient.request.mockRejectedValue(new Error('No competitive intelligence found'));

      const result = await getCompetitiveIntelTool.handler({
        competitor: 'Unknown Competitor'
      }, mockApiClient);

      expect(result).toContain('No Competitive Intelligence Found');
      expect(result).toContain('Unknown Competitor');
      expect(result).toContain('New competitor');
    });
  });

  describe('findProcessWorkflowsTool', () => {
    it('should have correct tool definition', () => {
      expect(findProcessWorkflowsTool.name).toBe('find_process_workflows');
      expect(findProcessWorkflowsTool.description).toContain('process workflows');
      expect(findProcessWorkflowsTool.inputSchema.properties.processType).toBeDefined();
      expect(findProcessWorkflowsTool.inputSchema.properties.processType.enum).toContain('poc');
    });

    it('should handle successful process workflow request', async () => {
      const mockApiResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            processType: 'poc',
            workflows: [{
              id: 1,
              name: 'Account Verification POC',
              description: '1. Setup test environment\n2. Configure API endpoints\n3. Run validation tests',
              processInfo: {
                processType: 'POC Validation',
                steps: ['Setup test environment', 'Configure API endpoints'],
                roles: ['Technical Lead', 'Solutions Engineer']
              },
              solution: { name: 'Account Verification' }
            }],
            total: 1
          })
        }]
      };

      mockApiClient.request.mockResolvedValue(mockApiResponse);

      const result = await findProcessWorkflowsTool.handler({
        processType: 'poc',
        solution: 'Account Verification',
        includeRoles: true
      }, mockApiClient);

      expect(result).toContain('Process Workflows: POC');
      expect(result).toContain('Account Verification POC');
      expect(result).toContain('Technical Lead');
      expect(result).toContain('Setup test environment');
    });
  });

  describe('discoverPlaybooksTool', () => {
    it('should have correct tool definition', () => {
      expect(discoverPlaybooksTool.name).toBe('discover_playbooks');
      expect(discoverPlaybooksTool.description).toContain('Discover available playbooks');
      expect(discoverPlaybooksTool.inputSchema.properties.solution).toBeDefined();
      expect(discoverPlaybooksTool.inputSchema.properties.showGaps).toBeDefined();
    });

    it('should handle successful playbook discovery', async () => {
      const mockApiResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            playbooks: [{
              id: 1,
              name: 'Enterprise Banking Playbook',
              description: 'Comprehensive playbook for enterprise banking clients',
              playCount: 8,
              playTypes: ['DISCOVERY', 'DEMO', 'VALUE_PROPOSITION'],
              solution: { name: 'Account Verification' },
              segment: { name: 'Enterprise' }
            }],
            total: 1,
            gaps: {
              coveragePercentage: 60,
              missingPlayTypes: ['COMPETITIVE_POSITIONING', 'PROCESS']
            }
          })
        }]
      };

      mockApiClient.request.mockResolvedValue(mockApiResponse);

      const result = await discoverPlaybooksTool.handler({
        solution: 'Account Verification',
        segment: 'Enterprise',
        showGaps: true
      }, mockApiClient);

      expect(result).toContain('Playbook Discovery');
      expect(result).toContain('Enterprise Banking Playbook');
      expect(result).toContain('Coverage Score');
      expect(result).toContain('60%');
      expect(result).toContain('Missing Play Types');
    });

    it('should require at least one filter', async () => {
      const result = await discoverPlaybooksTool.handler({
        showGaps: false
      }, mockApiClient);

      expect(result).toContain('Please provide at least one filter');
    });
  });
});
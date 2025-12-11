import { describe, it, expect } from 'vitest';
import { formatSubProjectForContext } from './ArticleGenerator';
import { KeywordSubProject } from '../types';

describe('ArticleGenerator Utils', () => {
    describe('formatSubProjectForContext', () => {
        it('formats sub-project correctly', () => {
            const mockSubProject: KeywordSubProject = {
                id: 'sub-1',
                name: 'Test Sub',
                parent_project_id: 'proj-1',
                saved_at: '',
                model_used: 'gpt-4',
                keywords: [
                    {
                        id: 'k1', keyword: 'main key', type: '引流型', pageType: 'Blog',
                        children: [
                            {
                                id: 'c1',
                                keyword: 'sub key',
                                type: '认知型',
                                lsi: [{ id: 'l1', text: 'lsi1' }, { id: 'l2', text: 'lsi2' }]
                            }
                        ]
                    }
                ]
            };

            const result = formatSubProjectForContext(mockSubProject);

            expect(result).toContain('Sub-Project: Test Sub');
            expect(result).toContain('Model Used: gpt-4');
            expect(result).toContain('Keyword: main key');
            expect(result).toContain('Keyword: sub key');
            expect(result).toContain('LSI: lsi1, lsi2');
        });
    });
});

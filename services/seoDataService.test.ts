import { describe, it, expect } from 'vitest';
import { getKdColor, formatVolume, mapDfsItemToMetric } from './seoDataService';

describe('seoDataService Utils', () => {
    describe('getKdColor', () => {
        it('returns green for low difficulty', () => {
            expect(getKdColor(10)).toContain('text-green-400');
            expect(getKdColor(29)).toContain('text-green-400');
        });
        it('returns yellow for medium difficulty', () => {
            expect(getKdColor(30)).toContain('text-yellow-400');
            expect(getKdColor(59)).toContain('text-yellow-400');
        });
        it('returns red for high difficulty', () => {
            expect(getKdColor(60)).toContain('text-red-400');
            expect(getKdColor(100)).toContain('text-red-400');
        });
    });

    describe('formatVolume', () => {
        it('formats zero correctly', () => {
            expect(formatVolume(0)).toBe('0');
        });
        it('formats simple numbers', () => {
            expect(formatVolume(999)).toBe('999');
        });
        it('formats thousands', () => {
            expect(formatVolume(1500)).toBe('1.5k');
            expect(formatVolume(1000)).toBe('1.0k');
        });
        it('formats millions', () => {
            expect(formatVolume(1500000)).toBe('1.5M');
        });
    });

    describe('mapDfsItemToMetric', () => {
        it('maps basic item correctly', () => {
            const mockItem = {
                keyword: 'test keyword',
                keyword_info: {
                    search_volume: 1000,
                    cpc: 1.5,
                    competition: 0.5
                },
                keyword_properties: {
                    keyword_difficulty: 45
                }
            };
            const result = mapDfsItemToMetric(mockItem);
            expect(result.keyword).toBe('test keyword');
            expect(result.search_volume).toBe(1000);
            expect(result.keyword_difficulty).toBe(45);
            expect(result.cpc).toBe(1.5);
            expect(result.competition).toBe(0.5);
        });

        it('prefers clickstream volume if present', () => {
            const mockItem = {
                keyword: 'test',
                keyword_info: { search_volume: 100 },
                clickstream_keyword_info: { search_volume: 500 }
            };
            const result = mapDfsItemToMetric(mockItem);
            expect(result.search_volume).toBe(500);
            expect(result.is_normalized).toBe(true);
        });
    });
});

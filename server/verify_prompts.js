import { buildSystemPrompt, buildUserPrompt, buildAutoMapPrompt } from './prompts.js';

function testPrompt(mode, data, question) {
    console.log(`\n=== TESTING MODE: ${mode} ===`);
    console.log('--- SYSTEM PROMPT ---');
    console.log(buildSystemPrompt(mode));
    console.log('--- USER PROMPT ---');
    console.log(buildUserPrompt(mode, data, question));
}

const mockData = [
    { widgetTitle: 'Total Revenue', primaryValue: 125400, unit: 'USD', trend: 12.5 },
    { widgetTitle: 'Active Users', primaryValue: 8430, unit: '', trend: -2.1 }
];

// Test Cases
testPrompt('project-brief', mockData);
testPrompt('ask', mockData, 'Why did units drop?');
testPrompt('ask', [], 'hi');
testPrompt('daily-brief', []);

console.log('\n=== TESTING AUTO-MAP ===');
const { system, user } = buildAutoMapPrompt(
    {
        status: 'success',
        data: {
            total_revenue: 5500.25,
            currency: 'USD',
            history: [
                { date: '2024-01-01', value: 100 },
                { date: '2024-01-02', value: 120 }
            ]
        }
    },
    'Daily Revenue'
);
console.log('--- SYSTEM ---');
console.log(system);
console.log('--- USER ---');
console.log(user);

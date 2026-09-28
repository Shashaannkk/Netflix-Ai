import { retrieveTimelineContext, generateGroundedAnswer } from '../services/aiEngineService.js';

/**
 * ──────────────────────────────────────────────────────────────────────────────
 *  AI CONTENT ENGINE & RETRIEVAL GROUNDING TEST SUITE (Part 7)
 * ──────────────────────────────────────────────────────────────────────────────
 */

// Mock Sample Timeline Data for "Tears of Steel"
const sampleTitleDoc = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Tears of Steel',
  description: 'In a dystopian future, a group of scientists attempts to restart a cybernetic robot.',
  durationSeconds: 734,
  timeline: [
    {
      _id: 'ev_001',
      timestampStart: 0,
      timestampEnd: 119,
      eventType: 'scene',
      payload: { sceneName: 'Ouroboros Bridge Meeting', location: 'Amsterdam Ruins', synopsis: 'Celia meets Thom on the destroyed bridge.' },
    },
    {
      _id: 'ev_002',
      timestampStart: 15,
      eventType: 'character',
      payload: { name: 'Celia', role: 'Cybernetic Engineer', description: 'Lead scientist working on the neural memory link.' },
    },
    {
      _id: 'ev_003',
      timestampStart: 45,
      eventType: 'glossary',
      payload: { term: 'Neural Memory Link', definition: 'A holographic memory extraction array allowing real-time projection of human thoughts.' },
    },
    {
      _id: 'ev_004',
      timestampStart: 120,
      timestampEnd: 300,
      eventType: 'scene',
      payload: { sceneName: 'Robotic Memory Override', location: 'Underground Bunker', synopsis: 'Barley activates the memory extraction device.' },
    },
    {
      _id: 'ev_005',
      timestampStart: 140,
      eventType: 'trivia',
      payload: { question: 'What alloy armor is used in the giant robot?', answer: 'Carbon-Titanium Composite' },
    },
    {
      _id: 'ev_006',
      timestampStart: 600, // Future spoiler event!
      eventType: 'scene',
      payload: { sceneName: 'Final Robot Self-Destruct', location: 'City Core', synopsis: 'The robot shuts down its core.' },
    },
  ],
};

const runTests = async () => {
  console.log('======================================================');
  console.log('🧪 RUNNING AI ENGINE RETRIEVAL & GROUNDING TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  };

  // Test 1: Anti-Spoiler Guard (Exclude events after currentTs + 5)
  const currentTs1 = 120;
  const context1 = retrieveTimelineContext(sampleTitleDoc, currentTs1);
  const futureEventIncluded = context1.recentEvents.some((e) => e.timestampStart > currentTs1 + 5);
  assert(!futureEventIncluded, 'Anti-Spoiler Guard excludes future events beyond currentTs + 5s');

  // Test 2: Current Scene Context Extraction
  assert(
    context1.currentScene && context1.currentScene.payload.sceneName === 'Robotic Memory Override',
    'Extracts correct active scene context at currentTs'
  );

  // Test 3: Character & Glossary Context
  assert(
    context1.characters.some((c) => c.payload.name === 'Celia'),
    'Extracts character introductions up to currentTs'
  );
  assert(
    context1.glossary.some((g) => g.payload.term === 'Neural Memory Link'),
    'Extracts glossary definitions up to currentTs'
  );

  // Test 4: Grounded Answer Synthesis
  const res1 = await generateGroundedAnswer({
    titleDoc: sampleTitleDoc,
    currentTs: 50,
    question: 'Who is Celia and what is her role?',
  });
  assert(
    res1.answer.includes('Celia') && res1.answer.includes('Engineer'),
    'Grounded Answer identifies character from timeline context'
  );
  assert(
    Array.isArray(res1.sourceEvents) && res1.sourceEvents.length > 0,
    'Returns sourceEvents array attributing timeline metadata used'
  );

  // Test 5: Insufficient Metadata Handling
  const emptyTitleDoc = { title: 'Empty Movie', timeline: [] };
  const resEmpty = await generateGroundedAnswer({
    titleDoc: emptyTitleDoc,
    currentTs: 50,
    question: 'What happens in the ending?',
  });
  assert(
    resEmpty.answer === 'The available timeline metadata does not contain enough information to answer this question.',
    'Handles missing metadata by returning standard fallback notice'
  );

  console.log('\n======================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed | ${failed} Failed`);
  console.log('======================================================');

  if (failed > 0) process.exit(1);
};

runTests();

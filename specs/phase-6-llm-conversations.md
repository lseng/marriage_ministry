# Phase 6: LLM-Powered Conversational Assignments

> **Reference**: See `specs/marriage-ministry-master-plan.md` for full context
> **Brand Guide**: See `specs/resonate-brand-guide.pdf`
> **Dependencies**: Phase 5 (SMS Integration)
> **Priority**: High - Differentiating Feature

---

## Overview

Enable couples to complete their assignments through natural conversation - either via SMS or web chat - with an AI assistant that guides them through reflection questions and extracts structured responses. This creates a more intimate, low-friction experience that feels like journaling together rather than filling out forms.

## Goals

1. Conversational interface for assignment completion
2. LLM-guided reflection through assignment questions
3. Automatic extraction of structured responses from conversation
4. Seamless integration with SMS (from Phase 5)
5. Web chat interface for couples who prefer typing
6. Coach visibility into conversation quality
7. Graceful escalation when LLM can't help

---

## Architecture

```
┌─────────────┐                    ┌─────────────────┐
│   SMS       │───────────────────>│                 │
│   (Twilio)  │<───────────────────│   Conversation  │
└─────────────┘                    │     Router      │
                                   │                 │
┌─────────────┐                    │  (Edge Fn)      │
│   Web Chat  │───────────────────>│                 │
│   (React)   │<───────────────────└────────┬────────┘
└─────────────┘                             │
                                            v
                          ┌─────────────────────────────────┐
                          │        Claude API               │
                          │   (Anthropic claude-3-5-sonnet) │
                          └─────────────────────────────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          v                 v                 v
                   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
                   │ Conversation │  │  Response   │  │  Homework   │
                   │   Storage    │  │  Extractor  │  │  Creator    │
                   └─────────────┘  └─────────────┘  └─────────────┘
```

---

## Database Schema

### File: `supabase/migrations/[timestamp]_llm_conversations.sql`

```sql
-- Conversation threads for LLM interactions
CREATE TABLE IF NOT EXISTS conversation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  assignment_status_id UUID REFERENCES assignment_statuses(id),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'web_chat', 'whatsapp')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'escalated')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  completion_score INTEGER CHECK (completion_score BETWEEN 0 AND 100), -- LLM-assessed
  extracted_insights JSONB, -- Structured extraction from conversation
  escalation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages in conversation
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES conversation_threads(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  model_version TEXT,
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}', -- For storing things like detected emotions, topics
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LLM configuration per assignment category
CREATE TABLE IF NOT EXISTS llm_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  assignment_category TEXT, -- null = default for all
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'claude-3-5-sonnet-20241022',
  temperature DECIMAL DEFAULT 0.7 CHECK (temperature BETWEEN 0 AND 1),
  max_tokens INTEGER DEFAULT 1000,
  extraction_schema JSONB, -- JSON schema for extracting structured responses
  conversation_starters TEXT[], -- Example opening messages
  max_turns INTEGER DEFAULT 20, -- Prevent runaway conversations
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_threads_couple ON conversation_threads(couple_id);
CREATE INDEX IF NOT EXISTS idx_threads_assignment ON conversation_threads(assignment_status_id);
CREATE INDEX IF NOT EXISTS idx_threads_status ON conversation_threads(status);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON conversation_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON conversation_messages(created_at);

-- RLS policies
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_configs ENABLE ROW LEVEL SECURITY;

-- Threads: Couples see own, coaches see assigned
CREATE POLICY "Couples view own threads"
  ON conversation_threads FOR SELECT
  USING (couple_id = get_couple_id());

CREATE POLICY "Coaches view assigned couples threads"
  ON conversation_threads FOR SELECT
  USING (
    is_coach() AND
    couple_id IN (
      SELECT id FROM couples
      WHERE coach_id = (SELECT id FROM coaches WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Admins view all threads"
  ON conversation_threads FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role manages threads"
  ON conversation_threads FOR ALL
  USING (auth.role() = 'service_role');

-- Messages follow thread access
CREATE POLICY "View messages for accessible threads"
  ON conversation_messages FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM conversation_threads
      WHERE couple_id = get_couple_id()
         OR (is_coach() AND couple_id IN (
              SELECT id FROM couples
              WHERE coach_id = (SELECT id FROM coaches WHERE profile_id = auth.uid())
            ))
         OR is_admin()
    )
  );

CREATE POLICY "Service role manages messages"
  ON conversation_messages FOR ALL
  USING (auth.role() = 'service_role');

-- LLM configs: Admin only
CREATE POLICY "Admins manage LLM configs"
  ON llm_configs FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Default LLM configurations
INSERT INTO llm_configs (name, assignment_category, system_prompt, extraction_schema) VALUES
(
  'default',
  NULL,
  'You are a warm, supportive conversation guide for the Resonate Marriage Ministry program. You help couples complete their weekly assignments through natural conversation.

Your role:
- Guide couples through assignment questions conversationally
- Ask follow-up questions to encourage deeper reflection
- Affirm their efforts and celebrate growth
- Keep responses concise (under 300 characters for SMS compatibility)
- Never be judgmental or preachy
- Reference their specific assignment context

Values to embody (from Resonate):
- Enjoy Grace: Invite delight and transformation through love
- Embody Love: Shape responses as expressions of care
- Engage Culture: Meet couples where they are
- Live Sent: Encourage action and growth

When you''ve gathered sufficient responses for all assignment questions, summarize what you''ve heard and ask if they''re ready to submit.

If a couple seems distressed or mentions serious issues (abuse, crisis, etc.), gently suggest they speak with their coach directly and provide the escalation phrase.',
  '{
    "type": "object",
    "properties": {
      "responses": {
        "type": "object",
        "description": "Extracted responses keyed by question number"
      },
      "key_insights": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Notable themes or breakthroughs"
      },
      "growth_areas": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Areas the couple wants to work on"
      },
      "completion_score": {
        "type": "integer",
        "minimum": 0,
        "maximum": 100,
        "description": "How thoroughly they addressed the assignment"
      },
      "summary": {
        "type": "string",
        "description": "Brief summary for coach review"
      },
      "flags": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Any concerns to bring to coach attention"
      }
    }
  }'
),
(
  'communication',
  'communication',
  'You are guiding a couple through a communication-focused assignment for Marriage Ministry.

Focus on:
- Active listening skills and their practice
- How they express needs without blame
- Understanding each other''s communication styles
- Creating safe spaces for difficult conversations

Ask questions like:
- "Tell me about a recent conversation that went well. What made it work?"
- "How do you each prefer to be approached with difficult topics?"
- "What''s one listening habit you''d like to strengthen?"

Keep responses brief and warm. End with clear next steps.',
  NULL
),
(
  'conflict',
  'conflict',
  'You are guiding a couple through a conflict-resolution assignment for Marriage Ministry.

Focus on:
- Identifying triggers and patterns
- Moving from blame to understanding
- Finding compromise and win-win solutions
- Repair after disagreements

Be especially gentle here - conflict is sensitive. Normalize that all couples disagree.

Ask questions like:
- "Think of a recent disagreement. What was it really about underneath?"
- "How do you each typically respond when hurt?"
- "What helps you both move toward repair?"

If they mention ongoing serious conflict, suggest speaking with their coach.',
  NULL
),
(
  'intimacy',
  'intimacy',
  'You are guiding a couple through an intimacy-focused assignment for Marriage Ministry.

Focus on:
- Emotional connection and vulnerability
- Quality time priorities
- Expressing appreciation and affection
- Spiritual intimacy and prayer together

Keep the conversation appropriate - focus on emotional and relational aspects, not physical details.

Ask questions like:
- "When do you feel most connected as a couple?"
- "How do you show appreciation for each other day-to-day?"
- "What''s one way you could be more intentional about time together?"

Create a warm, safe space for vulnerability.',
  NULL
);
```

---

## Implementation Steps

### Step 1: Conversation Service

**File: `services/conversation.ts`**

```typescript
import { supabase } from '@/lib/supabase';

export interface ConversationThread {
  id: string;
  couple_id: string;
  assignment_status_id: string | null;
  channel: 'sms' | 'web_chat';
  status: 'active' | 'completed' | 'abandoned' | 'escalated';
  message_count: number;
  completion_score: number | null;
  extracted_insights: ExtractedInsights | null;
}

export interface ConversationMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface ExtractedInsights {
  responses: Record<string, string>;
  key_insights: string[];
  growth_areas: string[];
  completion_score: number;
  summary: string;
  flags: string[];
}

// Get or create conversation thread
export async function getOrCreateThread(
  coupleId: string,
  assignmentStatusId: string | null,
  channel: 'sms' | 'web_chat'
): Promise<ConversationThread> {
  // Check for existing active thread
  if (assignmentStatusId) {
    const { data: existing } = await supabase
      .from('conversation_threads')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('assignment_status_id', assignmentStatusId)
      .eq('channel', channel)
      .eq('status', 'active')
      .single();

    if (existing) return existing;
  }

  // Create new thread
  const { data, error } = await supabase
    .from('conversation_threads')
    .insert({
      couple_id: coupleId,
      assignment_status_id: assignmentStatusId,
      channel,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get conversation history
export async function getConversationHistory(
  threadId: string
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Add message to conversation
export async function addMessage(
  threadId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: { tokens_used?: number; model_version?: string; processing_time_ms?: number }
): Promise<ConversationMessage> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .insert({
      thread_id: threadId,
      role,
      content,
      ...metadata,
    })
    .select()
    .single();

  if (error) throw error;

  // Update thread stats
  await supabase.rpc('increment_thread_message_count', { thread_id: threadId });

  return data;
}

// Complete conversation
export async function completeConversation(
  threadId: string,
  insights: ExtractedInsights
): Promise<void> {
  await supabase
    .from('conversation_threads')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_score: insights.completion_score,
      extracted_insights: insights,
    })
    .eq('id', threadId);
}

// Escalate conversation to coach
export async function escalateConversation(
  threadId: string,
  reason: string
): Promise<void> {
  await supabase
    .from('conversation_threads')
    .update({
      status: 'escalated',
      escalation_reason: reason,
    })
    .eq('id', threadId);

  // Get thread details for notification
  const { data: thread } = await supabase
    .from('conversation_threads')
    .select(`
      *,
      couples(
        coach_id,
        coaches(profile_id)
      )
    `)
    .eq('id', threadId)
    .single();

  if (thread?.couples?.coaches?.profile_id) {
    // Notify coach (implement via notification service)
    console.log('Notify coach:', thread.couples.coaches.profile_id);
  }
}

// Get thread by ID
export async function getThread(threadId: string): Promise<ConversationThread | null> {
  const { data } = await supabase
    .from('conversation_threads')
    .select('*')
    .eq('id', threadId)
    .single();

  return data;
}
```

### Step 2: LLM Conversation Handler (Edge Function)

**File: `supabase/functions/llm-conversation/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.20.0';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

interface ConversationRequest {
  thread_id?: string;
  couple_id: string;
  assignment_status_id?: string;
  message: string;
  channel: 'sms' | 'web_chat';
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY! });

  const body: ConversationRequest = await req.json();

  try {
    // Get or create thread
    let thread;
    if (body.thread_id) {
      const { data } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('id', body.thread_id)
        .single();
      thread = data;

      if (!thread || thread.status !== 'active') {
        return jsonResponse({ error: 'Thread not found or inactive' }, 400);
      }
    } else {
      const { data, error } = await supabase
        .from('conversation_threads')
        .insert({
          couple_id: body.couple_id,
          assignment_status_id: body.assignment_status_id || null,
          channel: body.channel,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      thread = data;
    }

    // Check turn limit
    if (thread.message_count >= 40) { // 20 user + 20 assistant
      await supabase
        .from('conversation_threads')
        .update({ status: 'abandoned' })
        .eq('id', thread.id);
      return jsonResponse({
        thread_id: thread.id,
        response: "We've had a good conversation! To continue, please log into the portal or start a new text conversation.",
        is_complete: false,
      });
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('role, content')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true });

    // Get context
    const context = await getConversationContext(supabase, body.couple_id, body.assignment_status_id);

    // Get LLM config
    const config = await getLLMConfig(supabase, context.assignment?.category);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(config.system_prompt, context);

    // Store user message
    await supabase.from('conversation_messages').insert({
      thread_id: thread.id,
      role: 'user',
      content: body.message,
    });

    // Update thread
    await supabase
      .from('conversation_threads')
      .update({
        message_count: thread.message_count + 1,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', thread.id);

    // Call Claude
    const startTime = Date.now();
    const response = await anthropic.messages.create({
      model: config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: config.max_tokens || 1000,
      temperature: config.temperature || 0.7,
      system: systemPrompt,
      messages: [
        ...(messages || []).map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: body.message },
      ],
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';
    const processingTime = Date.now() - startTime;

    // Store assistant response
    await supabase.from('conversation_messages').insert({
      thread_id: thread.id,
      role: 'assistant',
      content: assistantMessage,
      tokens_used: response.usage.output_tokens,
      model_version: config.model || 'claude-3-5-sonnet-20241022',
      processing_time_ms: processingTime,
    });

    // Update thread stats
    await supabase
      .from('conversation_threads')
      .update({
        message_count: thread.message_count + 2,
        total_tokens_used: (thread.total_tokens_used || 0) + response.usage.input_tokens + response.usage.output_tokens,
      })
      .eq('id', thread.id);

    // Check for escalation signals
    if (shouldEscalate(body.message, assistantMessage)) {
      await supabase
        .from('conversation_threads')
        .update({
          status: 'escalated',
          escalation_reason: 'Detected potential crisis or sensitive topic',
        })
        .eq('id', thread.id);

      return jsonResponse({
        thread_id: thread.id,
        response: assistantMessage + "\n\nI've let your coach know you might want to connect with them directly.",
        is_complete: false,
        escalated: true,
      });
    }

    // Check if conversation is complete
    const isComplete = await checkCompletion(
      supabase,
      anthropic,
      thread.id,
      context,
      messages || [],
      body.message,
      assistantMessage
    );

    if (isComplete) {
      await finalizeConversation(supabase, anthropic, thread.id, context);
    }

    return jsonResponse({
      thread_id: thread.id,
      response: assistantMessage,
      is_complete: isComplete,
    });

  } catch (error: any) {
    console.error('Conversation error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface ConversationContext {
  couple: {
    husband_first_name: string;
    wife_first_name: string;
  };
  assignment: {
    title: string;
    description: string;
    content: string;
    category: string;
    questions: string[];
  } | null;
  assignment_status_id: string | null;
}

async function getConversationContext(
  supabase: any,
  coupleId: string,
  assignmentStatusId?: string
): Promise<ConversationContext> {
  // Get couple info
  const { data: couple } = await supabase
    .from('couples')
    .select('husband_first_name, wife_first_name')
    .eq('id', coupleId)
    .single();

  let assignment = null;
  let statusId = assignmentStatusId || null;

  if (assignmentStatusId) {
    const { data: status } = await supabase
      .from('assignment_statuses')
      .select(`
        id,
        assignments (
          title,
          description,
          content,
          category,
          form_templates (fields)
        )
      `)
      .eq('id', assignmentStatusId)
      .single();

    if (status?.assignments) {
      const a = status.assignments;
      assignment = {
        title: a.title,
        description: a.description || '',
        content: a.content || '',
        category: a.category || 'general',
        questions: extractQuestions(a.content, a.form_templates?.fields),
      };
    }
  } else {
    // Find current pending assignment
    const { data: status } = await supabase
      .from('assignment_statuses')
      .select(`
        id,
        assignments (
          title,
          description,
          content,
          category,
          form_templates (fields)
        )
      `)
      .eq('couple_id', coupleId)
      .in('status', ['sent', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (status?.assignments) {
      statusId = status.id;
      const a = status.assignments;
      assignment = {
        title: a.title,
        description: a.description || '',
        content: a.content || '',
        category: a.category || 'general',
        questions: extractQuestions(a.content, a.form_templates?.fields),
      };
    }
  }

  return {
    couple: couple || { husband_first_name: 'Partner', wife_first_name: 'Partner' },
    assignment,
    assignment_status_id: statusId,
  };
}

function extractQuestions(content: string, formFields?: any[]): string[] {
  const questions: string[] = [];

  // Extract from form fields if available
  if (formFields && Array.isArray(formFields)) {
    for (const field of formFields) {
      if (field.label) {
        questions.push(field.label);
      }
    }
  }

  // Also look for questions in content (lines ending with ?)
  if (content) {
    const matches = content.match(/[^.!?\n]+\?/g);
    if (matches) {
      questions.push(...matches.map(q => q.trim()));
    }
  }

  return questions.length > 0 ? questions : ['What are your reflections on this topic?'];
}

async function getLLMConfig(supabase: any, category?: string): Promise<any> {
  // Try category-specific config first
  if (category) {
    const { data: specific } = await supabase
      .from('llm_configs')
      .select('*')
      .eq('assignment_category', category)
      .eq('is_active', true)
      .single();

    if (specific) return specific;
  }

  // Fall back to default
  const { data: defaultConfig } = await supabase
    .from('llm_configs')
    .select('*')
    .is('assignment_category', null)
    .eq('is_active', true)
    .single();

  return defaultConfig || {
    system_prompt: 'You are a helpful assistant for marriage ministry.',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    max_tokens: 1000,
  };
}

function buildSystemPrompt(template: string, context: ConversationContext): string {
  let prompt = template;

  // Replace placeholders
  prompt = prompt.replace(/\{husband_name\}/g, context.couple.husband_first_name);
  prompt = prompt.replace(/\{wife_name\}/g, context.couple.wife_first_name);

  if (context.assignment) {
    prompt = prompt.replace(/\{assignment_title\}/g, context.assignment.title);
    prompt = prompt.replace(/\{assignment_description\}/g, context.assignment.description);
    prompt = prompt.replace(/\{assignment_questions\}/g, context.assignment.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'));

    // Add assignment context
    prompt += `\n\n---\nCurrent Assignment: "${context.assignment.title}"\n`;
    prompt += `Description: ${context.assignment.description}\n`;
    prompt += `Questions to cover:\n${context.assignment.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
  } else {
    prompt += '\n\n---\nNo specific assignment. Have a general check-in conversation.';
  }

  return prompt;
}

function shouldEscalate(userMessage: string, assistantResponse: string): boolean {
  const crisisKeywords = [
    'abuse', 'abusing', 'hit me', 'hits me', 'violent', 'violence',
    'kill myself', 'suicide', 'suicidal', 'want to die', 'end my life',
    'divorce', 'leaving', 'affair', 'cheating', 'unfaithful',
    'scared of', 'afraid of him', 'afraid of her',
    'help me', 'emergency', 'crisis',
  ];

  const lowerMessage = userMessage.toLowerCase();
  return crisisKeywords.some(keyword => lowerMessage.includes(keyword));
}

async function checkCompletion(
  supabase: any,
  anthropic: Anthropic,
  threadId: string,
  context: ConversationContext,
  previousMessages: any[],
  userMessage: string,
  assistantMessage: string
): Promise<boolean> {
  if (!context.assignment) return false;

  // Need at least a few exchanges
  if (previousMessages.length < 4) return false;

  // Quick check: Did the assistant indicate completion?
  const completionPhrases = [
    'ready to submit',
    'shall i submit',
    'want me to save',
    'submit your response',
    'great conversation',
    'wonderful sharing',
  ];

  const lowerAssistant = assistantMessage.toLowerCase();
  const lowerUser = userMessage.toLowerCase();

  const assistantAskedSubmit = completionPhrases.some(p => lowerAssistant.includes(p));
  const userConfirmed = ['yes', 'sure', 'submit', 'done', 'save', 'ok', 'okay'].some(
    w => lowerUser === w || lowerUser.startsWith(w + ' ') || lowerUser.endsWith(' ' + w)
  );

  if (assistantAskedSubmit && userConfirmed) {
    return true;
  }

  // More thorough check with LLM for longer conversations
  if (previousMessages.length >= 8) {
    const allMessages = [
      ...previousMessages,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      system: `You assess if a couple has adequately addressed assignment questions through conversation.
Questions: ${context.assignment.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
Respond with ONLY "COMPLETE" or "INCOMPLETE" - nothing else.`,
      messages: [
        {
          role: 'user',
          content: `Conversation:\n${allMessages.map(m => `${m.role}: ${m.content}`).join('\n\n')}\n\nHas the couple adequately addressed all questions?`,
        },
      ],
    });

    const assessment = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return assessment === 'COMPLETE';
  }

  return false;
}

async function finalizeConversation(
  supabase: any,
  anthropic: Anthropic,
  threadId: string,
  context: ConversationContext
): Promise<void> {
  // Get all messages
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  // Extract structured data with LLM
  const extractionResponse = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    system: `Extract structured data from this marriage ministry conversation.
Assignment: ${context.assignment?.title || 'General conversation'}
Questions: ${JSON.stringify(context.assignment?.questions || [])}

Respond with valid JSON matching this schema:
{
  "responses": { "question_1": "response", "question_2": "response" },
  "key_insights": ["insight 1", "insight 2"],
  "growth_areas": ["area 1"],
  "completion_score": 85,
  "summary": "Brief summary for coach",
  "flags": []
}`,
    messages: [
      {
        role: 'user',
        content: `Conversation:\n\n${messages?.map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}`,
      },
    ],
  });

  let extraction;
  try {
    const text = extractionResponse.content[0].type === 'text'
      ? extractionResponse.content[0].text
      : '{}';
    extraction = JSON.parse(text);
  } catch {
    extraction = {
      responses: {},
      key_insights: [],
      growth_areas: [],
      completion_score: 70,
      summary: 'Conversation completed',
      flags: [],
    };
  }

  // Update thread
  await supabase
    .from('conversation_threads')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_score: extraction.completion_score,
      extracted_insights: extraction,
    })
    .eq('id', threadId);

  // Create homework response if there's an assignment
  if (context.assignment_status_id) {
    // Get couple_id from thread
    const { data: thread } = await supabase
      .from('conversation_threads')
      .select('couple_id')
      .eq('id', threadId)
      .single();

    await supabase.from('homework_responses').insert({
      assignment_status_id: context.assignment_status_id,
      couple_id: thread?.couple_id,
      responses: extraction.responses,
      is_draft: false,
      submitted_at: new Date().toISOString(),
      submission_method: 'llm_conversation',
    });

    // Update assignment status
    await supabase
      .from('assignment_statuses')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', context.assignment_status_id);
  }
}
```

### Step 3: Web Chat Component

**File: `components/chat/AssignmentChat.tsx`**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Loader2, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface AssignmentChatProps {
  assignmentStatusId: string;
  assignmentTitle: string;
  onComplete?: () => void;
}

export function AssignmentChat({
  assignmentStatusId,
  assignmentTitle,
  onComplete,
}: AssignmentChatProps) {
  const { profile } = useAuth();
  const coupleId = profile?.couple_id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadStatus, setThreadStatus] = useState<'active' | 'completed' | 'escalated'>('active');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing thread
  useEffect(() => {
    if (coupleId && assignmentStatusId) {
      loadExistingThread();
    }
  }, [coupleId, assignmentStatusId]);

  async function loadExistingThread() {
    const { data: thread } = await supabase
      .from('conversation_threads')
      .select('id, status')
      .eq('couple_id', coupleId)
      .eq('assignment_status_id', assignmentStatusId)
      .eq('channel', 'web_chat')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (thread) {
      setThreadId(thread.id);
      setThreadStatus(thread.status);

      const { data: msgs } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('thread_id', thread.id)
        .neq('role', 'system')
        .order('created_at', { ascending: true });

      setMessages(msgs || []);
    }
  }

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    if (threadStatus === 'active') {
      inputRef.current?.focus();
    }
  }, [threadStatus, messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !coupleId) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setError(null);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const response = await supabase.functions.invoke('llm-conversation', {
        body: {
          thread_id: threadId,
          couple_id: coupleId,
          assignment_status_id: assignmentStatusId,
          message: userMessage,
          channel: 'web_chat',
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      setThreadId(data.thread_id);

      // Add assistant response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId), // Remove temp if still there
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: userMessage,
          created_at: new Date().toISOString(),
        },
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          created_at: new Date().toISOString(),
        },
      ]);

      if (data.is_complete) {
        setThreadStatus('completed');
        onComplete?.();
      }

      if (data.escalated) {
        setThreadStatus('escalated');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, coupleId, threadId, assignmentStatusId, onComplete]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-resonate-blue to-resonate-green text-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">Complete Your Assignment</h3>
        </div>
        <p className="text-sm opacity-90 mt-1">{assignmentTitle}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && threadStatus === 'active' && (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Start the conversation</p>
            <p className="text-sm text-gray-500 mt-1">
              Say hello and I'll guide you through this week's reflection.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
                message.role === 'user'
                  ? 'bg-resonate-blue text-white rounded-br-md'
                  : 'bg-white text-gray-900 rounded-bl-md border'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-resonate-blue rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-resonate-blue rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-resonate-blue rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 text-red-700 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Status messages */}
      {threadStatus === 'completed' && (
        <div className="p-4 bg-resonate-green/10 border-t border-resonate-green">
          <div className="flex items-center gap-2 text-resonate-green">
            <CheckCircle className="h-5 w-5" />
            <p className="font-medium">Assignment completed!</p>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Your responses have been submitted. Your coach will review them soon.
          </p>
        </div>
      )}

      {threadStatus === 'escalated' && (
        <div className="p-4 bg-amber-50 border-t border-amber-300">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">Coach notified</p>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Your coach has been notified and will reach out to you directly.
          </p>
        </div>
      )}

      {/* Input */}
      {threadStatus === 'active' && (
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-resonate-blue hover:bg-resonate-blue/90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send
          </p>
        </div>
      )}
    </Card>
  );
}
```

### Step 4: Integrate Chat with SMS (from Phase 5)

**Update: `supabase/functions/sms-webhook/index.ts`**

Add to the `handleSMSCommand` function to route conversational messages to LLM:

```typescript
async function handleSMSCommand(
  supabase: SupabaseClient,
  ctx: SMSContext
): Promise<string> {
  const command = ctx.body.toUpperCase().split(' ')[0];

  // ... existing command handling ...

  // Default: Start or continue LLM conversation
  return await handleConversationalMessage(supabase, ctx);
}

async function handleConversationalMessage(
  supabase: SupabaseClient,
  ctx: SMSContext
): Promise<string> {
  // Find or create conversation thread for SMS
  const { data: existingThread } = await supabase
    .from('conversation_threads')
    .select('id')
    .eq('couple_id', ctx.coupleId)
    .eq('channel', 'sms')
    .eq('status', 'active')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();

  // Find current assignment
  const { data: status } = await supabase
    .from('assignment_statuses')
    .select('id')
    .eq('couple_id', ctx.coupleId)
    .in('status', ['sent', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Call LLM conversation edge function
  const { data, error } = await supabase.functions.invoke('llm-conversation', {
    body: {
      thread_id: existingThread?.id,
      couple_id: ctx.coupleId,
      assignment_status_id: status?.id,
      message: ctx.body,
      channel: 'sms',
    },
  });

  if (error) {
    console.error('LLM conversation error:', error);
    return 'Sorry, I had trouble processing that. Try again or reply HELP for commands.';
  }

  let response = data.response;

  // Truncate for SMS if needed (will be split into multiple messages by Twilio)
  if (response.length > 1500) {
    response = response.slice(0, 1450) + '... (continued in portal)';
  }

  if (data.is_complete) {
    response += '\n\nYour response has been submitted!';
  }

  return response;
}
```

### Step 5: Coach Conversation Review Component

**File: `components/reviews/ConversationReview.tsx`**

```typescript
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Phone, Monitor, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversationThread {
  id: string;
  channel: 'sms' | 'web_chat';
  status: string;
  message_count: number;
  completion_score: number | null;
  extracted_insights: {
    summary: string;
    key_insights: string[];
    flags: string[];
  } | null;
  started_at: string;
  completed_at: string | null;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ConversationReviewProps {
  homeworkResponseId: string;
  coupleNames: string;
}

export function ConversationReview({
  homeworkResponseId,
  coupleNames,
}: ConversationReviewProps) {
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadConversation();
  }, [homeworkResponseId]);

  async function loadConversation() {
    // Get assignment_status_id from homework response
    const { data: response } = await supabase
      .from('homework_responses')
      .select('assignment_status_id')
      .eq('id', homeworkResponseId)
      .single();

    if (!response?.assignment_status_id) return;

    // Get conversation thread
    const { data: threadData } = await supabase
      .from('conversation_threads')
      .select('*')
      .eq('assignment_status_id', response.assignment_status_id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (!threadData) return;

    setThread(threadData);

    // Get messages
    const { data: msgs } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('thread_id', threadData.id)
      .neq('role', 'system')
      .order('created_at', { ascending: true });

    setMessages(msgs || []);
  }

  if (!thread) return null;

  const ChannelIcon = thread.channel === 'sms' ? Phone : Monitor;
  const insights = thread.extracted_insights;

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-resonate-blue" />
          <span className="font-medium text-sm">Conversation Summary</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <ChannelIcon className="h-3 w-3 mr-1" />
            {thread.channel === 'sms' ? 'SMS' : 'Web Chat'}
          </Badge>
          {thread.completion_score && (
            <Badge
              variant={thread.completion_score >= 70 ? 'success' : 'warning'}
              className="text-xs"
            >
              {thread.completion_score}% complete
            </Badge>
          )}
        </div>
      </div>

      {/* AI Summary */}
      {insights?.summary && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700">{insights.summary}</p>
        </div>
      )}

      {/* Key Insights */}
      {insights?.key_insights && insights.key_insights.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Key Insights</p>
          <div className="flex flex-wrap gap-2">
            {insights.key_insights.map((insight, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {insight}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Flags for Coach Attention */}
      {insights?.flags && insights.flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-amber-700 mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">Items for Attention</span>
          </div>
          <ul className="text-xs text-amber-800 space-y-1">
            {insights.flags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Toggle full conversation */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-resonate-blue hover:underline"
      >
        {isExpanded ? 'Hide' : 'View'} full conversation ({thread.message_count} messages)
      </button>

      {/* Full conversation */}
      {isExpanded && (
        <div className="mt-3 border-t pt-3 max-h-96 overflow-y-auto space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm ${
                msg.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <span
                className={`inline-block px-3 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-resonate-blue/10 text-resonate-dark-gray'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {msg.content}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

---

## Environment Variables

Add to Supabase Edge Function secrets:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Testing Requirements

### Unit Tests

```typescript
describe('Conversation Service', () => {
  test('creates new thread when none exists', async () => {
    const thread = await getOrCreateThread('couple-123', 'status-456', 'web_chat');
    expect(thread.id).toBeDefined();
    expect(thread.status).toBe('active');
  });

  test('returns existing active thread', async () => {
    const first = await getOrCreateThread('couple-123', 'status-456', 'web_chat');
    const second = await getOrCreateThread('couple-123', 'status-456', 'web_chat');
    expect(first.id).toBe(second.id);
  });
});
```

### Integration Tests

```typescript
describe('LLM Conversation', () => {
  test('handles conversation turn', async () => {
    const response = await supabase.functions.invoke('llm-conversation', {
      body: {
        couple_id: 'couple-123',
        assignment_status_id: 'status-456',
        message: 'Hello!',
        channel: 'web_chat',
      },
    });

    expect(response.data.thread_id).toBeDefined();
    expect(response.data.response).toBeTruthy();
    expect(response.data.is_complete).toBe(false);
  });

  test('detects escalation triggers', async () => {
    const response = await supabase.functions.invoke('llm-conversation', {
      body: {
        couple_id: 'couple-123',
        message: 'I feel like my spouse is being abusive',
        channel: 'web_chat',
      },
    });

    expect(response.data.escalated).toBe(true);
  });
});
```

---

## Acceptance Criteria

- [ ] Couples can start conversation via web chat
- [ ] Couples can continue SMS conversations with LLM
- [ ] LLM guides through assignment questions naturally
- [ ] Conversation history persists across sessions
- [ ] Completion detection works accurately
- [ ] Structured responses extracted from conversation
- [ ] Homework response created on completion
- [ ] Assignment status updated to completed
- [ ] Escalation triggered for crisis keywords
- [ ] Coach notified on escalation
- [ ] Coaches can view conversation summaries
- [ ] Coaches can expand to see full conversation
- [ ] AI-generated insights highlight key themes
- [ ] Flags surface items needing attention
- [ ] Turn limit prevents runaway conversations
- [ ] Works seamlessly with existing SMS commands

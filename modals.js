const axios = require('axios');

const VC_TOOLS = {
  ZOOM: 'ZOOM',
  UEX: 'UEX',
  'MS-TEAMS': 'MS-TEAM',
  'G-MEET': 'G-MEET'
};

const createLoginModal = () => {
  return {
    type: "modal",
    callback_id: "login_modal",
    title: {
      type: "plain_text",
      text: "🔐 Login to UExcelerate",
      emoji: true
    },
    blocks: [
      {
        type: "input",
        block_id: "email_input",
        element: {
          type: "plain_text_input",
          action_id: "email"
        },
        label: {
          type: "plain_text",
          text: "📧 Email",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "password_input",
        element: {
          type: "plain_text_input",
          action_id: "password"
        },
        label: {
          type: "plain_text",
          text: "🔑 Password",
          emoji: true
        }
      }
    ],
    submit: {
      type: "plain_text",
      text: "Login",
      emoji: true
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true
    }
  };
};

const createSearchCoachModal = () => {
  const growthAreas = [
    "Approachability", "Active Listening", "Analytical Thinking", "Agility",
    "Driving Engagement", "Driving for Results", "Driving Vision & Purpose",
    "Emotional Intelligence", "Empathy", "Energy Levels", "Engaging Employees",
    "Empowerment", "Engaging with Others", "Finding Purpose and Passion",
    "Generate Enthusiasm", "Global Mindset", "Humility", "Humour",
    "Impact through Influence", "Innovation", "Integrity", "Interpersonal Understanding",
    "Leveraging Networks", "Managing Ambiguity", "Managing Change", "Managing Complexity",
    "Managing Conflict", "Managing Diversity", "Managing Media and PR",
    "Managing Social Media", "Managing Talent", "Managing Upward", "Market Focused",
    "Motivating Others", "Negotiation", "Network Building", "Nimble Learning",
    "Opportunistic", "Oral Communication", "Organizational Awareness", "Patience",
    "Peer Relationships", "Perseverance", "Persuasion", "Planning & Organizing",
    "Poise", "Presentation Skills", "Problem Solving", "Process Management",
    "Providing Feedback", "Relationship Building", "Resilience", "Resource Management",
    "Resourcefulness", "Self Awareness", "Self Confidence", "Self Development",
    "Situational Leadership", "Soliciting Team Input", "Spirituality",
    "Stakeholder Management", "Stakeholder Savvy", "Strategic Planning",
    "Stress Tolerance", "Systems Thinking", "Taking Initiative",
    "Taking on Tough Situations", "Teamwork", "Time Management", "Values Alignment",
    "Work Life balance", "Encouraging Work Life Balance", "Written Communication",
    "Mindfulness", "Goal Setting", "Public speaking", "Trustworthiness",
    "Holding People Accountable", "Walk the Talk"
  ].map((area, index) => ({
    text: {
      type: "plain_text",
      text: area,
      emoji: true
    },
    value: index.toString() // Using index as value
  }));

  return {
    type: "modal",
    callback_id: "search_coach_modal",
    title: {
      type: "plain_text",
      text: "Find Coach", // Fixed title length
      emoji: true
    },
    blocks: [
      {
        type: "input",
        block_id: "work_on",
        element: {
          type: "plain_text_input",
          action_id: "work_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Describe what you want to work on..."
          }
        },
        label: {
          type: "plain_text",
          text: "What do you want to work on?",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "why_work",
        element: {
          type: "plain_text_input",
          action_id: "why_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Explain your motivation..."
          }
        },
        label: {
          type: "plain_text",
          text: "Why do you want to work on this?",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "changes",
        element: {
          type: "plain_text_input",
          action_id: "changes_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "What changes do you hope to see..."
          }
        },
        label: {
          type: "plain_text",
          text: "What changes do you want to achieve?",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "skills",
        element: {
          type: "multi_static_select",
          action_id: "skills_select",
          placeholder: {
            type: "plain_text",
            text: "Select growth areas",
            emoji: true
          },
          options: growthAreas,
          max_selected_items: 5
        },
        label: {
          type: "plain_text",
          text: "Select growth areas (max 5)",
          emoji: true
        }
      }
    ],
    submit: {
      type: "plain_text",
      text: "Search",
      emoji: true
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true
    }
  };
};

const createBookingModal = async (authId, userToken) => {
  try {
    // Fetch coach profile
    const profileResponse = await axios.post(
      'https://api-beta.uexcelerate.app/api/v1/coach/profile/public_view',
      { authId },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const coachProfile = profileResponse.data.data;

    return {
      type: "modal",
      callback_id: "booking_modal",
      private_metadata: JSON.stringify({ authId }),
      title: {
        type: "plain_text",
        text: "Schedule Session"
      },
      blocks: [
        {
          type: "input",
          block_id: "session_name",
          element: {
            type: "plain_text_input",
            action_id: "session_name_input",
            placeholder: {
              type: "plain_text",
              text: "Enter session name"
            }
          },
          label: {
            type: "plain_text",
            text: "Session Name"
          }
        },
        // ... add more booking form fields ...
      ],
      submit: {
        type: "plain_text",
        text: "Schedule"
      }
    };
  } catch (error) {
    console.error('Error creating booking modal:', error);
    throw error;
  }
};

const createScheduleSessionModal = (authId, coachName) => {
  return {
    type: "modal",
    callback_id: "schedule_session_modal",
    private_metadata: JSON.stringify({ userId: authId, name: coachName }),
    title: {
      type: "plain_text",
      text: "Schedule Session",
      emoji: true
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Schedule a session with *${coachName}*`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Note:* For virtual sessions, video conferencing tool and meeting link are required. For in-person sessions, location is required."
        }
      },
      {
        type: "input",
        block_id: "session_name",
        element: {
          type: "plain_text_input",
          action_id: "session_name_input",
          placeholder: {
            type: "plain_text",
            text: "Enter session name"
          }
        },
        label: {
          type: "plain_text",
          text: "Session Name",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "session_date",
        element: {
          type: "datepicker",
          action_id: "date_picker",
          initial_date: new Date().toISOString().split('T')[0],
          placeholder: {
            type: "plain_text",
            text: "Select date"
          }
        },
        label: {
          type: "plain_text",
          text: "Date",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "session_time",
        element: {
          type: "timepicker",
          action_id: "time_picker",
          initial_time: "09:00",
          placeholder: {
            type: "plain_text",
            text: "Select time"
          }
        },
        label: {
          type: "plain_text",
          text: "Time",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "duration",
        element: {
          type: "plain_text_input",
          action_id: "duration_input",
          initial_value: "60",
          placeholder: {
            type: "plain_text",
            text: "Duration in minutes"
          }
        },
        label: {
          type: "plain_text",
          text: "Duration (minutes)",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "session_mode",
        element: {
          type: "static_select",
          action_id: "session_mode_select",
          placeholder: {
            type: "plain_text",
            text: "Select session mode"
          },
          initial_option: {
            text: {
              type: "plain_text",
              text: "Virtual",
              emoji: true
            },
            value: "0"
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "Virtual",
                emoji: true
              },
              value: "0"
            },
            {
              text: {
                type: "plain_text",
                text: "In-Person",
                emoji: true
              },
              value: "1"
            }
          ]
        },
        label: {
          type: "plain_text",
          text: "Session Mode",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "vc_tool",
        optional: true, // Will be validated in handler
        element: {
          type: "static_select",
          action_id: "vc_tool_select",
          placeholder: {
            type: "plain_text",
            text: "Select tool (required for virtual)"
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "Zoom",
                emoji: true
              },
              value: "ZOOM"
            },
            {
              text: {
                type: "plain_text",
                text: "Google Meet",
                emoji: true
              },
              value: "G-MEET"
            },
            {
              text: {
                type: "plain_text",
                text: "Microsoft Teams",
                emoji: true
              },
              value: "MS-TEAM"
            },
            {
              text: {
                type: "plain_text",
                text: "UExcelerate",
                emoji: true
              },
              value: "UEX"
            }
          ]
        },
        label: {
          type: "plain_text",
          text: "VC Tool (for Virtual)",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "vc_link",
        optional: true, // Will be validated in handler
        element: {
          type: "plain_text_input",
          action_id: "vc_link_input",
          placeholder: {
            type: "plain_text",
            text: "Enter meeting link (required for virtual)"
          }
        },
        label: {
          type: "plain_text",
          text: "Meeting Link (for Virtual)",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "location",
        optional: true, // Will be validated in handler
        element: {
          type: "plain_text_input",
          action_id: "location_input",
          placeholder: {
            type: "plain_text",
            text: "Enter location (required for in-person)"
          }
        },
        label: {
          type: "plain_text",
          text: "Location (for In-Person)",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "add_to_calendar",
        optional: true,
        element: {
          type: "checkboxes",
          action_id: "calendar_checkbox",
          options: [
            {
              text: {
                type: "plain_text",
                text: "Add to Google Calendar",
                emoji: true
              },
              value: "add_calendar"
            }
          ]
        },
        label: {
          type: "plain_text",
          text: "Calendar Integration",
          emoji: true
        }
      }
    ],
    submit: {
      type: "plain_text",
      text: "Schedule",
      emoji: true
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true
    }
  };
};

const createAddGoalModal = (coachInfo) => {
  // Parse coach info if provided
  const coach = coachInfo ? JSON.parse(coachInfo) : null;
  
  return {
    type: "modal",
    callback_id: "add_goal_modal",
    private_metadata: coachInfo || JSON.stringify({}),
    title: {
      type: "plain_text",
      text: "🎯 Add New Goal",
      emoji: true
    },
    blocks: [
      ...(coach ? [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Adding goal to work with *${coach.userName}*`
        }
      }] : []),
      {
        type: "input",
        block_id: "goal_name",
        element: {
          type: "plain_text_input",
          action_id: "goal_name_input",
          placeholder: {
            type: "plain_text",
            text: "Enter your goal"
          }
        },
        label: {
          type: "plain_text",
          text: "Goal Name",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "due_date",
        element: {
          type: "datepicker",
          action_id: "due_date_picker",
          placeholder: {
            type: "plain_text",
            text: "Select due date"
          }
        },
        label: {
          type: "plain_text",
          text: "Due Date",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "is_shared",
        element: {
          type: "radio_buttons",
          action_id: "is_shared_radio",
          initial_option: {
            text: {
              type: "plain_text",
              text: "Share with Coach",
              emoji: true
            },
            value: "true"
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "Share with Coach",
                emoji: true
              },
              value: "true"
            },
            {
              text: {
                type: "plain_text",
                text: "Keep Private",
                emoji: true
              },
              value: "false"
            }
          ]
        },
        label: {
          type: "plain_text",
          text: "Goal Visibility",
          emoji: true
        }
      }
    ],
    submit: {
      type: "plain_text",
      text: "Add Goal",
      emoji: true
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true
    }
  };
};

const createSessionModal = (coachInfo) => {
  const { userId, name } = JSON.parse(coachInfo);
  
  return {
    type: "modal",
    callback_id: "add_session_modal", 
    private_metadata: JSON.stringify({ userId, name }),
    title: {
      type: "plain_text",
      text: "Schedule Session",
      emoji: true
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Schedule a session with *${name}*`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Note:* For virtual sessions, video conferencing tool and meeting link are required. For in-person sessions, location is required."
        }
      },
      {
        type: "input",
        block_id: "session_name",
        element: {
          type: "plain_text_input",
          action_id: "session_name_input",
          placeholder: {
            type: "plain_text",
            text: "Enter session name"
          }
        },
        label: {
          type: "plain_text",
          text: "Session Name",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "session_date",
        element: {
          type: "datepicker",
          action_id: "date_picker",
          initial_date: new Date().toISOString().split('T')[0],
          placeholder: {
            type: "plain_text",
            text: "Select date"
          }
        },
        label: {
          type: "plain_text",
          text: "Date",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "session_time",
        element: {
          type: "timepicker",
          action_id: "time_picker",
          initial_time: "09:00",
          placeholder: {
            type: "plain_text",
            text: "Select time"
          }
        },
        label: {
          type: "plain_text",
          text: "Time",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "duration",
        element: {
          type: "plain_text_input",
          action_id: "duration_input",
          initial_value: "60",
          placeholder: {
            type: "plain_text",
            text: "Duration in minutes"
          }
        },
        label: {
          type: "plain_text",
          text: "Duration (minutes)",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "session_mode",
        element: {
          type: "static_select",
          action_id: "session_mode_select",
          placeholder: {
            type: "plain_text",
            text: "Select session mode"
          },
          initial_option: {
            text: {
              type: "plain_text",
              text: "Virtual",
              emoji: true
            },
            value: "0"
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "Virtual",
                emoji: true
              },
              value: "0"
            },
            {
              text: {
                type: "plain_text",
                text: "In-Person",
                emoji: true
              },
              value: "1"
            }
          ]
        },
        label: {
          type: "plain_text",
          text: "Session Mode",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "vc_tool",
        optional: true, // Will be validated in handler
        element: {
          type: "static_select",
          action_id: "vc_tool_select",
          placeholder: {
            type: "plain_text",
            text: "Select tool (required for virtual)"
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "Zoom",
                emoji: true
              },
              value: "ZOOM"
            },
            {
              text: {
                type: "plain_text",
                text: "Google Meet",
                emoji: true
              },
              value: "G-MEET"
            },
            {
              text: {
                type: "plain_text",
                text: "Microsoft Teams",
                emoji: true
              },
              value: "MS-TEAM"
            },
            {
              text: {
                type: "plain_text",
                text: "UExcelerate",
                emoji: true
              },
              value: "UEX"
            }
          ]
        },
        label: {
          type: "plain_text",
          text: "VC Tool (for Virtual)",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "vc_link",
        optional: true, // Will be validated in handler
        element: {
          type: "plain_text_input",
          action_id: "vc_link_input",
          placeholder: {
            type: "plain_text",
            text: "Enter meeting link (required for virtual)"
          }
        },
        label: {
          type: "plain_text",
          text: "Meeting Link (for Virtual)",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "location",
        optional: true, // Will be validated in handler
        element: {
          type: "plain_text_input",
          action_id: "location_input",
          placeholder: {
            type: "plain_text",
            text: "Enter location (required for in-person)"
          }
        },
        label: {
          type: "plain_text",
          text: "Location (for In-Person)",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "add_to_calendar",
        optional: true,
        element: {
          type: "checkboxes",
          action_id: "calendar_checkbox",
          options: [
            {
              text: {
                type: "plain_text",
                text: "Add to Google Calendar",
                emoji: true
              },
              value: "add_calendar"
            }
          ]
        },
        label: {
          type: "plain_text",
          text: "Calendar Integration",
          emoji: true
        }
      }
    ],
    submit: {
      type: "plain_text",
      text: "Schedule",
      emoji: true
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true
    }
  };
};

/**
 * Safely fetch coaches with timeout handling
 * @param {string} userToken - The user's authentication token
 * @returns {Promise<Array>} - List of coaches
 */
const fetchCoaches = async (userToken) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await axios.get(
      'https://api-beta.uexcelerate.app/api/v1/learner/home/connected_users',
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (response.data.result !== "SUCCESS") {
      throw new Error(response.data.message || 'Failed to fetch coaches');
    }
    
    return response.data.data || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Coach fetching request timed out');
    }
    throw error;
  }
};

/**
 * Creates a coach selection modal for session scheduling
 * @param {string} userToken - The user's authentication token
 * @returns {Promise<Object>} - The modal view object
 */
const createCoachSelectionModal = async (userToken) => {
  try {
    const coaches = await fetchCoaches(userToken);
    
    if (!coaches || coaches.length === 0) {
      throw new Error("No connected coaches found");
    }

    const options = coaches.map(coach => ({
      text: {
        type: "plain_text",
        text: coach.userName
      },
      value: JSON.stringify({
        userId: coach.userId,
        name: coach.userName
      })
    }));

    return {
      type: "modal",
      callback_id: "coach_selection_modal",
      title: {
        type: "plain_text",
        text: "Select a Coach"
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Please select a coach to schedule a session with:"
          }
        },
        {
          type: "input",
          block_id: "coach_select",
          element: {
            type: "static_select",
            placeholder: {
              type: "plain_text",
              text: "Select a coach"
            },
            options: options,
            action_id: "selected_coach"
          },
          label: {
            type: "plain_text",
            text: "Coach"
          }
        }
      ],
      submit: {
        type: "plain_text",
        text: "Next"
      }
    };
  } catch (error) {
    console.error("Error creating coach selection modal:", error);
    throw error;
  }
};

/**
 * Creates a coach selection modal for goal creation
 * @param {string} userToken - The user's authentication token
 * @returns {Promise<Object>} - The modal view object
 */
const createGoalCoachSelectionModal = async (userToken) => {
  try {
    const coaches = await fetchCoaches(userToken);
    
    if (!coaches || coaches.length === 0) {
      throw new Error("No connected coaches found");
    }

    const options = coaches.map(coach => ({
      text: {
        type: "plain_text",
        text: coach.userName
      },
      value: JSON.stringify({
        userId: coach.userId,
        userName: coach.userName
      })
    }));

    return {
      type: "modal",
      callback_id: "goal_coach_selection_modal",
      title: {
        type: "plain_text",
        text: "Select a Coach"
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Please select a coach to add a goal with:"
          }
        },
        {
          type: "input",
          block_id: "coach_select",
          element: {
            type: "static_select",
            placeholder: {
              type: "plain_text",
              text: "Select a coach"
            },
            options: options,
            action_id: "selected_coach"
          },
          label: {
            type: "plain_text",
            text: "Coach"
          }
        }
      ],
      submit: {
        type: "plain_text",
        text: "Next"
      }
    };
  } catch (error) {
    console.error("Error creating goal coach selection modal:", error);
    throw error;
  }
};

const createSelectGoalModal = (coachInfo, goals) => {
  const { name } = JSON.parse(coachInfo);
  
  return {
    type: "modal",
    callback_id: "select_goal_modal",
    private_metadata: coachInfo,
    title: {
      type: "plain_text",
      text: "Select Goal",
      emoji: true
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Adding action with coach *${name}*`
        }
      },
      {
        type: "input",
        block_id: "goal_select",
        element: {
          type: "static_select",
          action_id: "selected_goal",
          placeholder: {
            type: "plain_text",
            text: "Choose a goal",
            emoji: true
          },
          options: goals.map(goal => ({
            text: {
              type: "plain_text",
              text: goal.goalName,
              emoji: true
            },
            value: goal.goalId.toString()
          }))
        },
        label: {
          type: "plain_text",
          text: "Select Goal",
          emoji: true
        }
      }
    ],
    submit: {
      type: "plain_text",
      text: "Next",
      emoji: true
    }
  };
};

const createAddActionModal = (coachInfo, goalInfo) => {  // Changed parameter to goalInfo
  const { userName } = JSON.parse(coachInfo);
  const { goalId, goalName } = JSON.parse(goalInfo);
  
  return {
    type: "modal",
    callback_id: "add_action_modal",
    private_metadata: JSON.stringify({
      ...JSON.parse(coachInfo),
      goalId,
      goalName
    }),
    title: {
      type: "plain_text",
      text: "📋 Add New Action",
      emoji: true
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Adding action for goal: *${goalName}*\nCoach: *${userName}*`
        }
      },
      {
        type: "input",
        block_id: "action_name",
        element: {
          type: "plain_text_input",
          action_id: "action_name_input",
          placeholder: {
            type: "plain_text",
            text: "Enter action name"
          }
        },
        label: {
          type: "plain_text",
          text: "Action Name",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "due_date",
        element: {
          type: "datepicker",
          action_id: "due_date_picker",
          placeholder: {
            type: "plain_text",
            text: "Select due date"
          }
        },
        label: {
          type: "plain_text",
          text: "Due Date",
          emoji: true
        }
      },
      {
        type: "input",
        block_id: "is_shared",
        element: {
          type: "radio_buttons",
          action_id: "is_shared_radio",
          initial_option: {
            text: {
              type: "plain_text",
              text: "Share with Coach",
              emoji: true
            },
            value: "true"
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "Share with Coach",
                emoji: true
              },
              value: "true"
            },
            {
              text: {
                type: "plain_text",
                text: "Keep Private",
                emoji: true
              },
              value: "false"
            }
          ]
        },
        label: {
          type: "plain_text",
          text: "Action Visibility",
          emoji: true
        }
      }
    ],
    submit: {
      type: "plain_text",
      text: "Add Action",
      emoji: true
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true
    }
  };
};

const createActionCoachSelectionModal = async (userToken) => {
  try {
    const coaches = await fetchCoaches(userToken);
    
    if (!coaches || coaches.length === 0) {
      throw new Error("No connected coaches found");
    }

    const options = coaches.map(coach => ({
      text: {
        type: "plain_text",
        text: coach.userName
      },
      value: JSON.stringify({
        userId: coach.userId,
        authId: coach.authId,
        userName: coach.userName,
        designation: coach.designation
      })
    }));

    return {
      type: "modal",
      callback_id: "action_coach_selection_modal",
      title: {
        type: "plain_text",
        text: "Select Coach",
        emoji: true
      },
      blocks: [
        {
          type: "input",
          block_id: "coach_select",
          element: {
            type: "static_select",
            action_id: "selected_coach",
            placeholder: {
              type: "plain_text",
              text: "Choose a coach",
              emoji: true
            },
            options: options
          },
          label: {
            type: "plain_text",
            text: "Select Coach",
            emoji: true
          }
        }
      ],
      submit: {
        type: "plain_text",
        text: "Next",
        emoji: true
      }
    };
  } catch (error) {
    console.error('Error creating coach selection modal:', error);
    throw error;
  }
};

const createGoalSelectionModal = async (coachInfo, userToken) => {
  const coach = JSON.parse(coachInfo);
  try {
    const response = await axios.post(
      'https://api-beta.uexcelerate.app/api/v1/learner/action/user_goals',
      {
        userId: coach.userId
      },
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.result !== "SUCCESS" || !response.data.data.length) {
      throw new Error('No goals found');
    }

    return {
      type: "modal",
      callback_id: "goal_selection_modal",
      private_metadata: coachInfo,
      title: {
        type: "plain_text",
        text: "Select Goal",
        emoji: true
      },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Adding action with coach *${coach.userName}*`
          }
        },
        {
          type: "input",
          block_id: "goal_select",
          element: {
            type: "static_select",
            action_id: "selected_goal",
            placeholder: {
              type: "plain_text",
              text: "Choose a goal",
              emoji: true
            },
            options: response.data.data.map(goal => ({
              text: {
                type: "plain_text",
                text: goal.goalName,
                emoji: true
              },
              value: JSON.stringify({
                goalId: goal.goalId,
                goalName: goal.goalName
              })
            }))
          },
          label: {
            type: "plain_text",
            text: "Select Goal",
            emoji: true
          }
        }
      ],
      submit: {
        type: "plain_text",
        text: "Next",
        emoji: true
      }
    };
  } catch (error) {
    console.error('Error creating goal selection modal:', error);
    throw error;
  }
};



module.exports = {
  createLoginModal,
  createSearchCoachModal,
  createBookingModal,
  createScheduleSessionModal,
  createAddGoalModal,
  createCoachSelectionModal,
  createSessionModal,
  createSelectGoalModal,
  createAddActionModal,
  createGoalCoachSelectionModal,
  createActionCoachSelectionModal,
  createGoalSelectionModal
};
import { composeStories } from "@storybook/react";
import * as stories from "./FeedbackContainer.stories";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import "@testing-library/jest-dom";
import { prepareStoryContextForTest } from "@nova/react-test-utils/relay";
import { executePlayFunction } from "../../testing-utils/executePlayFunction";
import type { NovaEventing, EventWrapper } from "@nova/types";
import { eventTypes, type FeedbackTelemetryEvent } from "../../events/events";

const bubbleMock = jest.fn<NovaEventing, [EventWrapper]>();
const generateEventMock = jest.fn<NovaEventing, [EventWrapper]>();

jest.mock("@nova/react", () => ({
  ...jest.requireActual("@nova/react"),
  useNovaEventing: () => ({
    bubble: bubbleMock,
    generateEvent: generateEventMock,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const { AutoGeneratedDataOnly, Primary, Liked, Like, LikeFailure, Loading } =
  composeStories(stories);

describe("FeedbackContainer", () => {
  it("should render when no parameters are provided", async () => {
    render(<AutoGeneratedDataOnly />);
    const button = await screen.findByRole("button", { name: "Like" });
    expect(button).toBeInTheDocument();
  });

  it("should show like button", async () => {
    render(<Primary />);
    const button = await screen.findByRole("button", { name: "Like" });
    expect(button).toBeInTheDocument();
  });

  it("should show unlike button", async () => {
    render(<Liked />);
    const button = await screen.findByRole("button", { name: "Unlike" });
    expect(button).toBeInTheDocument();
  });

  it("should show unlike button after clicking like button and send telemetry event", async () => {
    const { container } = render(<Like />);
    await executePlayFunction(
      Like,
      prepareStoryContextForTest(Like, container),
    );
    const button = await screen.findByRole("button", { name: "Unlike" });
    expect(button).toBeInTheDocument();

    const telemetryEvents = generateEventMock.mock.calls
      .filter(([{ event }]) => event.type === eventTypes.feedbackTelemetry)
      .map(([{ event }]) => event as FeedbackTelemetryEvent);

    const unlikeEvents = telemetryEvents.filter(
      (event) => event.data?.().operation === "FeedbackLiked",
    );

    expect(unlikeEvents).toHaveLength(1);
  });
  it("should show an error if the like button fails", async () => {
    const { container } = render(<LikeFailure />);
    await executePlayFunction(
      LikeFailure,
      prepareStoryContextForTest(LikeFailure, container),
    );
    const error = await screen.findByText("Something went wrong");
    expect(error).toBeInTheDocument();
  });

  it("should show loading state", async () => {
    render(<Loading />);
    const loading = await screen.findByText("Loading...");
    expect(loading).toBeInTheDocument();
  });

  it("should correctly propagate parameters even when multiple stories with same resolvers are rendered", async () => {
    render(<Primary />);
    render(<Liked />);
    render(<Primary />);
    const texts = await screen.findAllByText("Feedback: Feedback title");
    expect(texts).toHaveLength(3);
    expect(texts[2]).toBeInTheDocument();
  });
});

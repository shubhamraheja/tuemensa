import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import GradientThumb from '../components/GradientThumb';

describe('GradientThumb', () => {
  it('shows the first letter when no photo is available', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<GradientThumb name="Mensa" seed={1} />);
    });

    const text = tree.root.findByType(Text);
    expect(text.props.children).toBe('M');
  });
});

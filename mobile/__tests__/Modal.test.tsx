import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MyModal from '../src/components/modal';

jest.mock('@react-native-community/blur', () => ({
  BlurView: 'BlurView',
}));

test('closes from the dedicated backdrop without wrapping modal content', async () => {
  const onClose = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <MyModal visible onClose={onClose} modalHeader="Test modal">
        Test content
      </MyModal>,
    );
  });

  const backdrop = renderer.root
    .findAll(node => node.props.accessibilityLabel === 'Close modal')
    .at(0);

  expect(backdrop).toBeDefined();
  expect(backdrop?.children).not.toContain('Test content');

  await ReactTestRenderer.act(() => backdrop?.props.onPress());
  expect(onClose).toHaveBeenCalledTimes(1);
});

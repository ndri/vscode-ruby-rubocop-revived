export const rubyFileWithWarnings = `
  def someMethod(    arg )
    if arg
      return arg
    end

    return :default
    end                    
`;

export const rubyFileToQuickFix = `
if something and other and 4
  return nil
end

{ # some comment
      car: 3,
    boot: 56, bonnet: 10
}
`;

export const rubyFileWithDisabledCopForLine = `
if something and other and 4 # rubocop:disable Style/IfUnlessModifier
  return nil
end
`;

export const rubyFileWithDisabledCopForFile = `# rubocop:disable Style/IfUnlessModifier
if something and other and 4
  return nil
end
# rubocop:enable Style/IfUnlessModifier
`;

export const jsFile = `
  function printHello() {
    console.log("Hi i'm JavaScript!")
  }

  let something = 3;
`;

var KeywordMatcher = {
  normalizeText: function(text) {
    if (typeof text !== 'string') return "";
    return text.toLowerCase().replace(/[^\w\s]/g, "");
  },
  
  checkMatch: function(text, keywords) {
    if (!text || !keywords || keywords.length === 0) return null;
    var normalizedText = this.normalizeText(text);
    
    for (var i = 0; i < keywords.length; i++) {
        var keyword = keywords[i];
      var normalizedKeyword = this.normalizeText(keyword);
      if (normalizedKeyword && normalizedText.indexOf(normalizedKeyword) !== -1) {
        return keyword; // return the matched keyword
      }
    }
    return null;
  }
};
